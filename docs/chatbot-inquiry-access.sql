-- Applied to mdcouftltagqmqhvckiv through the authenticated SQL Editor.
-- Existing permissive policies remain unchanged. These restrictions protect
-- only rows categorized as 제작 문의, including rows created by older clients.
begin;

create policy chatbot_inquiry_select_guard
on public.consultations as restrictive
for select to anon, authenticated
using (category is distinct from '제작 문의');

create policy chatbot_inquiry_update_guard
on public.consultations as restrictive
for update to anon, authenticated
using (category is distinct from '제작 문의')
with check (category is distinct from '제작 문의');

create policy chatbot_inquiry_delete_guard
on public.consultations as restrictive
for delete to anon, authenticated
using (category is distinct from '제작 문의');

create policy chatbot_inquiry_insert_guard
on public.consultations as restrictive
for insert to anon, authenticated
with check (
  category is distinct from '제작 문의'
  or (
    is_private = true
    and status = 'pending'
    and admin_reply is null
    and replied_at is null
  )
);

commit;
