-- CB-08 (20261031120000_fix_cb08_backup_restore_restrict.sql): execute_backup_restore so master via service_role, com allowlist de tabelas.
begin;
select plan(10);

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

select hasnt_function('public', 'execute_backup_restore', ARRAY['text'], 'versao antiga (SQL arbitrario) removida');
select has_function('public', 'execute_backup_restore', ARRAY['jsonb'], 'versao estruturada existe');
select ok(not has_function_privilege('authenticated', 'public.execute_backup_restore(jsonb)', 'EXECUTE'), 'authenticated sem EXECUTE');
select ok(not has_function_privilege('anon', 'public.execute_backup_restore(jsonb)', 'EXECUTE'), 'anon sem EXECUTE');
select ok(has_function_privilege('service_role', 'public.execute_backup_restore(jsonb)', 'EXECUTE'), 'service_role com EXECUTE');

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select throws_ok($$select public.execute_backup_restore('{"leads":[]}'::jsonb)$$, '42501', null, 'master autenticado nao chama direto');
reset role;

set local role service_role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"service_role"}';

select throws_ok($$select public.execute_backup_restore('{"leads":[]}'::jsonb)$$, 'P0001', 'Forbidden: master only', 'nao-master e recusado');
reset role;

set local role service_role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"service_role"}';

select is(public.execute_backup_restore('{"leads":[{"a":1},{"a":2}],"tasks":[{"a":3}]}'::jsonb), '{"restored":3}'::jsonb, 'master aceita tabelas da allowlist');
select throws_ok($$select public.execute_backup_restore('{"profiles":[{"a":1}]}'::jsonb)$$, 'P0001', 'Table profiles not in allowlist', 'tabela fora da allowlist e recusada');
select throws_ok($$select public.execute_backup_restore('{"leads;drop table leads":[]}'::jsonb)$$, 'P0001', null, 'chave com SQL injetado e recusada');
reset role;

select * from finish();
rollback;
