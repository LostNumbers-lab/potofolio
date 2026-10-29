-- Server-only console data. This file contains no administrator credentials.
create table public.chatbot_admin_accounts (
  username text primary key,
  password_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table public.chatbot_admin_sessions (
  token_hash text primary key,
  username text not null references public.chatbot_admin_accounts(username),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.chatbot_published_versions (
  id uuid primary key default gen_random_uuid(),
  version_number bigint generated always as identity unique,
  title text not null,
  config jsonb not null,
  created_by text not null,
  restored_from uuid references public.chatbot_published_versions(id),
  created_at timestamptz not null default now()
);
create table public.chatbot_console_state (
  id boolean primary key default true check (id),
  draft jsonb not null,
  draft_revision bigint not null default 1,
  published_version_id uuid references public.chatbot_published_versions(id),
  draft_restored_from uuid references public.chatbot_published_versions(id),
  updated_at timestamptz not null default now()
);
alter table public.chatbot_admin_accounts enable row level security;
alter table public.chatbot_admin_sessions enable row level security;
alter table public.chatbot_published_versions enable row level security;
alter table public.chatbot_console_state enable row level security;
revoke all on public.chatbot_admin_accounts, public.chatbot_admin_sessions, public.chatbot_published_versions, public.chatbot_console_state from public, anon, authenticated;
grant all on public.chatbot_admin_accounts, public.chatbot_admin_sessions, public.chatbot_published_versions, public.chatbot_console_state to service_role;
grant usage, select on sequence public.chatbot_published_versions_version_number_seq to service_role;
create index chatbot_admin_sessions_expiry_idx on public.chatbot_admin_sessions(expires_at);

create function public.chatbot_console_login(p_username text, p_password text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare a public.chatbot_admin_accounts%rowtype; t text;
begin
  select * into a from public.chatbot_admin_accounts where username = 'admin' for update;
  if not found then return jsonb_build_object('ok',false,'error','로그인 정보를 확인해 주세요.'); end if;
  if a.locked_until > now() then return jsonb_build_object('ok',false,'locked',true,'error','로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.'); end if;
  if a.locked_until is not null and a.locked_until <= now() then
    update public.chatbot_admin_accounts set failed_attempts=0, locked_until=null where username=a.username;
    a.failed_attempts := 0;
  end if;
  if p_username is distinct from a.username or p_password is null or octet_length(p_password)>72 or extensions.crypt(p_password,a.password_hash) is distinct from a.password_hash then
    update public.chatbot_admin_accounts set failed_attempts=a.failed_attempts+1,
      locked_until=case when a.failed_attempts+1 >= 10 then now()+interval '15 minutes' else null end
      where username=a.username;
    return jsonb_build_object('ok',false,'error','로그인 정보를 확인해 주세요.');
  end if;
  update public.chatbot_admin_accounts set failed_attempts=0,locked_until=null where username=a.username;
  delete from public.chatbot_admin_sessions where expires_at <= now();
  t := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.chatbot_admin_sessions(token_hash,username,expires_at)
  values(encode(extensions.digest(t,'sha256'),'hex'),a.username,now()+interval '8 hours');
  return jsonb_build_object('ok',true,'token',t,'username',a.username,'expiresAt',now()+interval '8 hours');
end; $$;

create function public.chatbot_console_action(p_token text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare u text; s public.chatbot_console_state%rowtype; v public.chatbot_published_versions%rowtype; result jsonb; row_count integer; result_limit integer; result_offset integer;
begin
  select username into u from public.chatbot_admin_sessions
  where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
  if u is null then raise exception '관리자 로그인이 필요합니다.' using errcode='28000'; end if;
  if p_action='logout' then
    delete from public.chatbot_admin_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
    return jsonb_build_object('ok',true);
  end if;
  if p_action='get' then
    select * into s from public.chatbot_console_state where id=true;
    select * into v from public.chatbot_published_versions where id=s.published_version_id;
    return jsonb_build_object('draft',s.draft,'revision',s.draft_revision,'updatedAt',s.updated_at,'published',jsonb_build_object('id',v.id,'number',v.version_number,'title',v.title,'createdAt',v.created_at),'username',u);
  end if;
  if p_action in ('save_draft','publish','restore') then
    select * into s from public.chatbot_console_state where id=true for update;
    if (p_payload->>'expectedRevision')::bigint is distinct from s.draft_revision then
      raise exception '다른 화면에서 초안이 변경되었습니다. 최신 초안을 다시 불러와 주세요.' using errcode='40001';
    end if;
    if p_action='save_draft' then
      if jsonb_typeof(p_payload->'config') is distinct from 'object' or jsonb_typeof(p_payload->'config'->'nodes') is distinct from 'array' then raise exception '대화 데이터 형식을 확인해 주세요.'; end if;
      update public.chatbot_console_state set draft=p_payload->'config',draft_revision=draft_revision+1,draft_restored_from=null,updated_at=now() where id=true returning * into s;
      return jsonb_build_object('ok',true,'revision',s.draft_revision,'updatedAt',s.updated_at);
    elsif p_action='restore' then
      select * into v from public.chatbot_published_versions where id=(p_payload->>'versionId')::uuid;
      if not found then raise exception '게시 버전을 찾지 못했습니다.'; end if;
      update public.chatbot_console_state set draft=v.config,draft_revision=draft_revision+1,draft_restored_from=v.id,updated_at=now() where id=true returning * into s;
      return jsonb_build_object('ok',true,'draft',s.draft,'revision',s.draft_revision,'updatedAt',s.updated_at);
    else
      if length(trim(coalesce(p_payload->>'title',''))) not between 1 and 120 then raise exception '게시 버전 이름을 입력해 주세요.'; end if;
      insert into public.chatbot_published_versions(title,config,created_by,restored_from)
      values(trim(p_payload->>'title'),s.draft,u,s.draft_restored_from) returning * into v;
      update public.chatbot_console_state set published_version_id=v.id where id=true;
      return jsonb_build_object('ok',true,'id',v.id,'number',v.version_number,'title',v.title,'createdAt',v.created_at);
    end if;
  end if;
  if p_action='versions' then
    result_limit := least(greatest(coalesce((p_payload->>'limit')::integer,20),1),50);
    result_offset := greatest(coalesce((p_payload->>'offset')::integer,0),0);
    select coalesce(jsonb_agg(to_jsonb(x) order by x.version_number desc),'[]'::jsonb) into result from (
      select id,version_number,title,created_by,restored_from,created_at,jsonb_array_length(config->'nodes') as node_count
      from public.chatbot_published_versions order by version_number desc limit result_limit offset result_offset
    ) x;
    return jsonb_build_object('items',result,'total',(select count(*) from public.chatbot_published_versions),'activeId',(select published_version_id from public.chatbot_console_state where id=true));
  end if;
  if p_action='inquiries' then
    result_limit := least(greatest(coalesce((p_payload->>'limit')::integer,20),1),50);
    result_offset := greatest(coalesce((p_payload->>'offset')::integer,0),0);
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
      select id,title,content,author_name,contact,status,admin_reply,created_at,replied_at
      from public.consultations where category='제작 문의' order by created_at desc limit result_limit offset result_offset
    ) x;
    return jsonb_build_object('items',result,'total',(select count(*) from public.consultations where category='제작 문의'));
  end if;
  if p_action='update_inquiry' then
    if p_payload->>'status' not in ('pending','in_progress','completed') or p_payload->>'status' is null then raise exception '문의 상태를 확인해 주세요.'; end if;
    if length(coalesce(p_payload->>'reply','')) > 10000 then raise exception '답변은 10,000자 이내로 입력해 주세요.'; end if;
    update public.consultations set status=p_payload->>'status',admin_reply=nullif(trim(p_payload->>'reply'),''),
      replied_at=case when nullif(trim(p_payload->>'reply'),'') is null then null else now() end
      where id=(p_payload->>'id')::uuid and category='제작 문의';
    get diagnostics row_count=row_count;
    if row_count<>1 then raise exception '문의를 찾지 못했습니다.'; end if;
    return jsonb_build_object('ok',true);
  end if;
  if p_action='password' then
    if length(coalesce(p_payload->>'newPassword','')) not between 8 and 72 or octet_length(coalesce(p_payload->>'newPassword',''))>72 then raise exception '새 비밀번호는 8자 이상, UTF-8 기준 72바이트 이내로 입력해 주세요.'; end if;
    if not exists(select 1 from public.chatbot_admin_accounts where username=u and password_hash=extensions.crypt(p_payload->>'currentPassword',password_hash)) then raise exception '현재 비밀번호를 확인해 주세요.'; end if;
    update public.chatbot_admin_accounts set password_hash=extensions.crypt(p_payload->>'newPassword',extensions.gen_salt('bf',12)),updated_at=now() where username=u;
    delete from public.chatbot_admin_sessions where username=u;
    return jsonb_build_object('ok',true);
  end if;
  raise exception '지원하지 않는 관리 작업입니다.';
end; $$;

revoke all on function public.chatbot_console_login(text,text), public.chatbot_console_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.chatbot_console_login(text,text), public.chatbot_console_action(text,text,jsonb) to service_role;

-- The existing automatic-RLS event trigger is a DDL helper, not a public RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
