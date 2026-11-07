-- CB-05 (20261029120000_fix_cb05_integration_tokens_exposure.sql): tokens de integracao nao expostos a authenticated.
begin;
select plan(8);

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

insert into public.integrations (client_id, provider, tenant_id, access_token, refresh_token) values
  ('a0000000-0000-0000-0000-0000000000a1', 'meta', 'a0000000-0000-0000-0000-0000000000a1', 'SEGREDO-A', 'REFRESH-A'),
  ('b0000000-0000-0000-0000-0000000000b2', 'meta', 'b0000000-0000-0000-0000-0000000000b2', 'SEGREDO-B', 'REFRESH-B');

select has_view('public', 'integrations_safe', 'view integrations_safe existe');
select hasnt_column('public', 'integrations_safe', 'access_token', 'view nao expoe access_token');
select hasnt_column('public', 'integrations_safe', 'refresh_token', 'view nao expoe refresh_token');
select ok(not has_column_privilege('authenticated', 'public.integrations', 'access_token', 'SELECT'), 'authenticated sem SELECT em access_token');
select ok(not has_column_privilege('anon', 'public.integrations', 'refresh_token', 'SELECT'), 'anon sem SELECT em refresh_token');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok($$select access_token from public.integrations$$, '42501', null, 'leitura direta do token e negada');
-- a view roda como dono (bypassrls) salvo security_invoker; precisa continuar isolada por tenant
select is((select count(*)::int from public.integrations_safe), 1, 'integrations_safe: ve so a integracao do proprio tenant');
select is((select count(*)::int from public.integrations_safe where client_id = 'b0000000-0000-0000-0000-0000000000b2'), 0, 'integrations_safe: nao ve integracao de outro tenant');
reset role;

select * from finish();
rollback;
