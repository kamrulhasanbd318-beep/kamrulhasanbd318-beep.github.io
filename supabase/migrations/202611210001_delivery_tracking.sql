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