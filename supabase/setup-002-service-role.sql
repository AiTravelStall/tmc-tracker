-- TMC Tracker fix: grant the server-side service role access. Paste into SQL Editor → Run.
begin;
-- Newer Supabase projects no longer grant API roles access to new objects by default.
-- The server-side service role (user management, CSV import) needs explicit grants.
-- It bypasses RLS by design, so it is only used after an admin check in the app.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
insert into ops.schema_migrations (name) values ('20261124000004_service_role.sql') on conflict do nothing;
commit;
