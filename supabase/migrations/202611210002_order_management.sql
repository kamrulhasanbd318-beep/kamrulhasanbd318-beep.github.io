alter table public.delivery_tracking_orders
  add column if not exists order_token text,
  add column if not exists product_name text,
  add column if not exists product_variant text,
  add column if not exists quantity integer,
  add column if not exists total_amount numeric(12,2),
  add column if not exists currency text,
  add column if not exists order_notes text;

create index if not exists delivery_tracking_created_idx
  on public.delivery_tracking_orders (created_at desc);

create or replace function public.delivery_tracking_admin_update_status(p_tracking_code text,p_status text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.delivery_tracking_orders;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'superking99973@gmail.com' then raise exception 'Not authorized'; end if;
  if p_status not in ('order_received','preparing','dispatched','on_the_way','nearby','delivered','cancelled') then raise exception 'Invalid status'; end if;
  update public.delivery_tracking_orders set status=p_status,updated_at=now()
  where tracking_code=p_tracking_code returning * into v;
  if not found then raise exception 'Tracking code not found'; end if;
  return to_jsonb(v);
end;
$$;

create or replace function public.delivery_tracking_admin_update_route(
  p_tracking_code text,p_origin_label text,p_origin_lat double precision,p_origin_lng double precision,
  p_destination_label text,p_destination_lat double precision,p_destination_lng double precision,
  p_route_distance_m integer,p_route_duration_s integer,p_estimated_arrival_at timestamptz
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.delivery_tracking_orders;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'superking99973@gmail.com' then raise exception 'Not authorized'; end if;
  if p_origin_lat not between -90 and 90 or p_origin_lng not between -180 and 180
     or p_destination_lat not between -90 and 90 or p_destination_lng not between -180 and 180 then
    raise exception 'Invalid route coordinates';
  end if;
  update public.delivery_tracking_orders set origin_label=p_origin_label,origin_lat=p_origin_lat,origin_lng=p_origin_lng,
    destination_label=p_destination_label,destination_lat=p_destination_lat,destination_lng=p_destination_lng,
    route_distance_m=p_route_distance_m,route_duration_s=p_route_duration_s,
    estimated_arrival_at=p_estimated_arrival_at,updated_at=now()
  where tracking_code=p_tracking_code returning * into v;
  if not found then raise exception 'Order not found'; end if;
  return to_jsonb(v);
end;
$$;

revoke all on function public.delivery_tracking_admin_update_route(text,text,double precision,double precision,text,double precision,double precision,integer,integer,timestamptz) from public,anon;
grant execute on function public.delivery_tracking_admin_update_route(text,text,double precision,double precision,text,double precision,double precision,integer,integer,timestamptz) to authenticated;
