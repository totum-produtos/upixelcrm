-- CB-01 (20261028120000_fix_cb01_pending_user_tenant_block.sql): usuario pendente/recusado nao enxerga dados do tenant.
begin;
select plan(13);

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
  ('c0000000-0000-0000-0000-0000000000c1', 'Lead A', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1'),
  ('c0000000-0000-0000-0000-0000000000c2', 'Lead B', 'b0000000-0000-0000-0000-0000000000b2', 'b0000000-0000-0000-0000-0000000000b2');

-- aprovado
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(public.get_user_tenant_id(), 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'aprovado: get_user_tenant_id retorna o tenant');
select is(public.get_user_client_id(), 'a0000000-0000-0000-0000-0000000000a1', 'aprovado: get_user_client_id retorna o client');
select ok(public.is_user_approved(), 'aprovado: is_user_approved = true');
select is((select count(*)::int from public.leads), 1, 'aprovado: ve so o lead do proprio tenant');
reset role;

-- pendente
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(public.get_user_tenant_id(), null, 'pendente: get_user_tenant_id retorna NULL');
select is(public.get_user_client_id(), null, 'pendente: get_user_client_id retorna NULL');
select ok(not public.is_user_approved(), 'pendente: is_user_approved = false');
select is((select count(*)::int from public.leads), 0, 'pendente: nao ve nenhum lead');
reset role;

-- recusado
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(public.get_user_tenant_id(), null, 'recusado: get_user_tenant_id retorna NULL');
select ok(not public.is_user_approved(), 'recusado: is_user_approved = false');
select is((select count(*)::int from public.leads), 0, 'recusado: nao ve nenhum lead');
reset role;

-- master com status pending continua isento
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select ok(public.is_user_approved(), 'master: is_user_approved = true mesmo com status pending');
select is(public.get_user_tenant_id(), 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'master: get_user_tenant_id nao e bloqueado');
reset role;

select * from finish();
rollback;
