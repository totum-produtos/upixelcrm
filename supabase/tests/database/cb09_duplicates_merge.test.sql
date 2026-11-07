-- CB-09 (20261101120000_fix_cb09_duplicates_merge_transactional.sql): merge_duplicate_leads re-vincula antes de apagar; so service_role.
begin;
select plan(9);

-- Fixture: cria usuario em auth.users e força o perfil (role, tenant, aprovação).
-- Roda como postgres antes de trocar de role; o cache de perfil só é lido depois.
create function pg_temp.mk_user(_id uuid, _role text, _status text, _tenant uuid) returns void
language plpgsql as $$
begin
  insert into auth.users (id, email) values (_id, _id::text || '@test.local');
  insert into public.profiles (id, name, email, role, client_id, tenant_id, approval_status)
  values (_id, 't', _id::text || '@test.local', _role, _tenant::text, _tenant, _status)
  on conflict (id) do update
    set role = excluded.role, client_id = excluded.client_id,
        tenant_id = excluded.tenant_id, approval_status = excluded.approval_status;
end $$;

insert into public.tenants (id, name, subdomain) values
  ('a0000000-0000-0000-0000-0000000000a1', 'Tenant A', 'tenant-a'),
  ('b0000000-0000-0000-0000-0000000000b2', 'Tenant B', 'tenant-b');
select pg_temp.mk_user('11111111-1111-1111-1111-111111111111', 'vendedor', 'approved', 'a0000000-0000-0000-0000-0000000000a1'); -- aprovado (A)
select pg_temp.mk_user('22222222-2222-2222-2222-222222222222', 'vendedor', 'pending', 'a0000000-0000-0000-0000-0000000000a1'); -- pendente (A)
select pg_temp.mk_user('33333333-3333-3333-3333-333333333333', 'vendedor', 'rejected', 'a0000000-0000-0000-0000-0000000000a1'); -- recusado (A)
select pg_temp.mk_user('44444444-4444-4444-4444-444444444444', 'master', 'pending', 'a0000000-0000-0000-0000-0000000000a1'); -- master (isento de aprovacao)
select pg_temp.mk_user('55555555-5555-5555-5555-555555555555', 'vendedor', 'approved', 'b0000000-0000-0000-0000-0000000000b2'); -- aprovado (B)
select pg_temp.mk_user('66666666-6666-6666-6666-666666666666', 'vendedor', 'approved', 'a0000000-0000-0000-0000-0000000000a1'); -- colega aprovado (A)

insert into public.leads (id, name, client_id, tenant_id) values
  ('c0000000-0000-0000-0000-0000000000c1', 'Primario', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1'),
  ('c0000000-0000-0000-0000-0000000000c2', 'Duplicado', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1');
insert into public.conversations (id, client_id, tenant_id, lead_id) values ('d0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000c2');
insert into public.tasks (id, client_id, tenant_id, lead_id, title) values ('e0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000c2', 'Tarefa');
insert into public.timeline_events (id, lead_id, type, content) values ('f0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-0000000000c2', 'note', 'nota');

select ok(not has_function_privilege('authenticated', 'public.merge_duplicate_leads(uuid, uuid[])', 'EXECUTE'), 'authenticated sem EXECUTE');
select ok(not has_function_privilege('anon', 'public.merge_duplicate_leads(uuid, uuid[])', 'EXECUTE'), 'anon sem EXECUTE');
select ok(has_function_privilege('service_role', 'public.merge_duplicate_leads(uuid, uuid[])', 'EXECUTE'), 'service_role com EXECUTE');

set local role service_role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"service_role"}';

select is(public.merge_duplicate_leads('c0000000-0000-0000-0000-0000000000c1', array['c0000000-0000-0000-0000-0000000000c2']::uuid[]) ->> 'deleted', '1', 'merge apagou 1 duplicado');
reset role;

select is((select count(*)::int from public.leads where id = 'c0000000-0000-0000-0000-0000000000c2'), 0, 'duplicado removido');
select is((select count(*)::int from public.leads where id = 'c0000000-0000-0000-0000-0000000000c1'), 1, 'primario preservado');
select is((select lead_id from public.conversations where id = 'd0000000-0000-0000-0000-0000000000d1'), 'c0000000-0000-0000-0000-0000000000c1'::uuid, 'conversa re-vinculada ao primario (nao ficou NULL)');
select is((select lead_id from public.tasks where id = 'e0000000-0000-0000-0000-0000000000e1'), 'c0000000-0000-0000-0000-0000000000c1'::uuid, 'tarefa re-vinculada ao primario');
select is((select lead_id from public.timeline_events where id = 'f0000000-0000-0000-0000-0000000000f1'), 'c0000000-0000-0000-0000-0000000000c1'::uuid, 'timeline re-vinculada ao primario');

select * from finish();
rollback;
