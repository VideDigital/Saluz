-- SALUZ: limite persistente de tentativas de acesso, sem IP, e-mail ou senha em texto.
-- Cliente correto: projeto Supabase da Anny. Invocação somente pela API autenticada com service_role.
create table if not exists public.saluz_login_limits (
  key_hash text primary key check (length(key_hash) = 64),
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.saluz_login_limits enable row level security;
revoke all on public.saluz_login_limits from public, anon, authenticated;
grant select, insert, update, delete on public.saluz_login_limits to service_role;

create or replace function public.saluz_check_login_limit(
  p_hash text, p_max integer default 8, p_window_seconds integer default 900
) returns boolean
language plpgsql security invoker
set search_path = public
as $$
declare tries integer;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
     or p_max < 1 or p_max > 30
     or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'invalid rate limit parameters';
  end if;
  insert into public.saluz_login_limits as limits (key_hash,window_start,attempts)
  values (p_hash,now(),1)
  on conflict (key_hash) do update
    set attempts = case
      when limits.window_start <= now()-make_interval(secs=>p_window_seconds)
      then 1 else limits.attempts+1 end,
    window_start = case
      when limits.window_start <= now()-make_interval(secs=>p_window_seconds)
      then now() else limits.window_start end
  returning attempts into tries;
  return tries<=p_max;
end;
$$;
revoke all on function public.saluz_check_login_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.saluz_check_login_limit(text,integer,integer) to service_role;

-- Retenção operacional: executar periodicamente no painel autorizado (ou pg_cron quando disponível):
-- delete from public.saluz_login_limits where window_start < now() - interval '48 hours';
