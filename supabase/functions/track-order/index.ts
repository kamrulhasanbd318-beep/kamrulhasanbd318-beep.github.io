import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9-]{6,24}$/.test(code)) return new Response(JSON.stringify({ error: "Invalid tracking code" }), { status: 400, headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ error: "Tracking service is not configured" }), { status: 503, headers: cors });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("delivery_tracking_orders")
    .select("tracking_code,status,origin_label,origin_lat,origin_lng,destination_label,destination_lat,destination_lng,route_distance_m,route_duration_s,estimated_arrival_at,created_at,updated_at")
    .eq("tracking_code", code).maybeSingle();
  if (error) return new Response(JSON.stringify({ error: "Lookup failed" }), { status: 500, headers: cors });
  if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  return new Response(JSON.stringify(data), { status: 200, headers: { ...cors, "Cache-Control": "no-store" } });
});