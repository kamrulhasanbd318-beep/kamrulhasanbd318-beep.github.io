create table if not exists public.delivery_tracking_orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique check (tracking_code ~ '^[A-Z0-9-]{6,24}$'),
  status text not null default 'preparing' check (status in ('preparing','dispatched','on_the_way','nearby','delivered','cancelled')),
  origin_label text not null, origin_lat double precision not null check (origin_lat between -90 and 90), origin_lng double precision not null check (origin_lng between -180 and 180),
  destination_label text not null, destination_lat double precision not null check (destination_lat between -90 and 90), destination_lng double precision not null check (destination_lng between -180 and 180),
  route_distance_m integer check (route_distance_m is null or route_distance_m >= 0),
  route_duration_s integer check (route_duration_s is null or route_duration_s >= 0),
  estimated_arrival_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.delivery_tracking_orders enable row level security;
revoke all on public.delivery_tracking_orders from anon, authenticated;
grant select, insert, update on public.delivery_tracking_orders to authenticated;
create policy "Only approved admin can manage delivery tracking" on public.delivery_tracking_orders for all to authenticated using (lower(coalesce(auth.jwt()->>'email','')) = 'superking99973@gmail.com') with check (lower(coalesce(auth.jwt()->>'email','')) = 'superking99973@gmail.com');
create index if not exists delivery_tracking_code_idx on public.delivery_tracking_orders (tracking_code);

create or replace function public.delivery_tracking_admin_list()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc), '[]'::jsonb)
  from public.delivery_tracking_orders o
  where lower(coalesce(auth.jwt()->>'email','')) = 'superking99973@gmail.com'
$$;

create or replace function public.delivery_tracking_admin_create(
  p_tracking_code text, p_status text, p_origin_label text,
  p_origin_lat double precision, p_origin_lng double precision,
  p_destination_label text, p_destination_lat double precision,
  p_destination_lng double precision, p_route_distance_m integer,
  p_route_duration_s integer, p_estimated_arrival_at timestamptz
)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v public.delivery_tracking_orders;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'superking99973@gmail.com' then raise exception 'Not authorized'; end if;
  insert into public.delivery_tracking_orders (
    tracking_code,status,origin_label,origin_lat,origin_lng,destination_label,destination_lat,destination_lng,route_distance_m,route_duration_s,estimated_arrival_at
  ) values (
    p_tracking_code,p_status,p_origin_label,p_origin_lat,p_origin_lng,p_destination_label,p_destination_lat,p_destination_lng,p_route_distance_m,p_route_duration_s,p_estimated_arrival_at
  ) returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.delivery_tracking_admin_update_status(p_tracking_code text,p_status text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v public.delivery_tracking_orders;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'superking99973@gmail.com' then raise exception 'Not authorized'; end if;
  update public.delivery_tracking_orders set status=p_status,updated_at=now()
  where tracking_code=p_tracking_code returning * into v;
  if not found then raise exception 'Tracking code not found'; end if;
  return to_jsonb(v);
end;
$$;

revoke all on function public.delivery_tracking_admin_list() from public, anon;
revoke all on function public.delivery_tracking_admin_create(text,text,text,double precision,double precision,text,double precision,double precision,integer,integer,timestamptz) from public, anon;
revoke all on function public.delivery_tracking_admin_update_status(text,text) from public, anon;
grant execute on function public.delivery_tracking_admin_list() to authenticated;
grant execute on function public.delivery_tracking_admin_create(text,text,text,double precision,double precision,text,double precision,double precision,integer,integer,timestamptz) to authenticated;
grant execute on function public.delivery_tracking_admin_update_status(text,text) to authenticated;
