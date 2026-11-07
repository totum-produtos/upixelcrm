-- CB-10 (20261102120000_fix_cb10_notifications_restrict_insert.sql): INSERT em notifications restrito ao mesmo tenant (ou master).
begin;
select plan(7);

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

select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Service role insert notifications'), 0, 'policy WITH CHECK (true) removida');
select ok(not has_table_privilege('anon', 'public.notifications', 'INSERT'), 'anon sem INSERT');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok($$insert into public.notifications (client_id, user_id, title) values ('a', '66666666-6666-6666-6666-666666666666', 'oi')$$, 'insere para usuario do mesmo tenant');
select throws_ok($$insert into public.notifications (client_id, user_id, title) values ('a', '55555555-5555-5555-5555-555555555555', 'spam')$$, '42501', null, 'nao insere para usuario de outro tenant');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_ok($$insert into public.notifications (client_id, user_id, title) values ('a', '66666666-6666-6666-6666-666666666666', 'oi')$$, '42501', null, 'usuario pendente nao insere');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select lives_ok($$insert into public.notifications (client_id, user_id, title) values ('a', '55555555-5555-5555-5555-555555555555', 'aviso')$$, 'master insere para qualquer tenant');
reset role;

set local role anon;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"anon"}';

select throws_ok($$insert into public.notifications (client_id, user_id, title) values ('a', '55555555-5555-5555-5555-555555555555', 'spam')$$, '42501', null, 'anon nao insere');
reset role;

select * from finish();
rollback;
