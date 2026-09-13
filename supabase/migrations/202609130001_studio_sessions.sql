-- Apply once in your Supabase project's SQL Editor, before deploying this branch.
-- No service-role key is needed by the app. Never expose auth tables or this
-- revocation table through public grants or permissive RLS policies.
begin;
create table if not exists public.studio_revoked_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  revoked_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
alter table public.studio_revoked_sessions enable row level security;
revoke all on public.studio_revoked_sessions from public, anon, authenticated;

create or replace function public.studio_session_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'active', exists (
      select 1 from auth.sessions s
      where s.id = (auth.jwt()->>'session_id')::uuid and s.user_id = auth.uid()
        and (s.not_after is null or s.not_after > now())
        and not exists (select 1 from public.studio_revoked_sessions r
          where r.user_id = s.user_id and r.session_id = s.id)
    ),
    'mfa_required', exists (select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'),
    'aal', auth.jwt()->>'aal'
  );
$$;

create or replace function public.studio_revoke_session()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.jwt()->>'session_id' is null then
    raise exception 'Session required' using errcode = '28000';
  end if;
  insert into public.studio_revoked_sessions(user_id, session_id)
  values (auth.uid(), (auth.jwt()->>'session_id')::uuid)
  on conflict do nothing;
end;
$$;

revoke all on function public.studio_session_status() from public, anon;
revoke all on function public.studio_revoke_session() from public, anon;
grant execute on function public.studio_session_status() to authenticated;
grant execute on function public.studio_revoke_session() to authenticated;
commit;
