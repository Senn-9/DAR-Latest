-- The PPMP Point Person role already exists in public.roles.
-- Assign one user per division by setting role_id and division_id on public.users.

-- Example assignment for one PPMP point person:
-- update public.users
-- set role_id = 11,
--     division_id = <division_id>
-- where username = '<username>';
