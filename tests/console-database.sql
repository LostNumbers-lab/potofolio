-- Integration tests use an uncommitted temporary password. ROLLBACK restores
-- the real administrator account, drafts and sessions. No password is printed.
begin;
set local role service_role;
do $$
declare login_result jsonb; token text; st jsonb; saved_state jsonb; original_version uuid; failed boolean; i integer;
begin
  update public.chatbot_admin_accounts set password_hash=extensions.crypt('temporary-test-password',extensions.gen_salt('bf',4)),failed_attempts=0,locked_until=null where username='admin';
  for i in 1..10 loop perform public.chatbot_console_login('admin','incorrect-test-password'); end loop;
  login_result:=public.chatbot_console_login('admin','temporary-test-password');
  if login_result->>'locked' is distinct from 'true' then raise exception 'Login rate limit failed'; end if;
  update public.chatbot_admin_accounts set failed_attempts=0,locked_until=null where username='admin';
  login_result:=public.chatbot_console_login('admin','temporary-test-password');
  token:=login_result->>'token';
  if length(token)<>64 then raise exception 'Session creation failed'; end if;
  st:=public.chatbot_console_action(token,'get','{}');
  original_version:=(st->'published'->>'id')::uuid;
  failed:=false;
  begin perform public.chatbot_console_action(token,'save_draft',jsonb_build_object('config',st->'draft','expectedRevision',(st->>'revision')::bigint-1));
  exception when sqlstate '40001' then failed:=true; end;
  if not failed then raise exception 'Stale draft overwrite was not blocked'; end if;
  failed:=false;
  begin perform public.chatbot_console_action(token,'publish',jsonb_build_object('title','must not publish','expectedRevision',(st->>'revision')::bigint-1));
  exception when sqlstate '40001' then failed:=true; end;
  if not failed then raise exception 'Stale publication was not blocked'; end if;
  saved_state:=public.chatbot_console_action(token,'save_draft',jsonb_build_object('config',st->'draft','expectedRevision',(st->>'revision')::bigint));
  if (select published_version_id from public.chatbot_console_state) is distinct from original_version then raise exception 'Draft save changed publication'; end if;
  perform public.chatbot_console_action(token,'restore',jsonb_build_object('versionId',original_version,'expectedRevision',(saved_state->>'revision')::bigint));
  if (select published_version_id from public.chatbot_console_state) is distinct from original_version then raise exception 'Draft restore changed publication'; end if;
  perform public.chatbot_console_action(token,'logout','{}');
  failed:=false;
  begin perform public.chatbot_console_action(token,'get','{}');
  exception when sqlstate '28000' then failed:=true; end;
  if not failed then raise exception 'Logged out session was accepted'; end if;
  login_result:=public.chatbot_console_login('admin','temporary-test-password');token:=login_result->>'token';
  perform public.chatbot_console_action(token,'password',jsonb_build_object('currentPassword','temporary-test-password','newPassword','temporary-new-password'));
  if exists(select 1 from public.chatbot_admin_sessions where username='admin') then raise exception 'Password change did not invalidate sessions'; end if;
  if not exists(select 1 from public.chatbot_admin_accounts where username='admin' and password_hash=extensions.crypt('temporary-new-password',password_hash)) then raise exception 'Password change failed'; end if;
end; $$;
rollback;
select 'PASS: rate limiting, sessions, stale revision protection, draft isolation, restore isolation, logout and password revocation' as result;
