import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign-in required" }, 401);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  if (body.action === "public-key") return publicKey ? json({ publicKey }) : json({ error: "VAPID keys are not configured" }, 503);

  if (body.action === "subscribe") {
    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth)
      return json({ error: "Invalid push subscription" }, 400);
    const { error } = await userClient.from("push_subscriptions").upsert({
      user_id: authData.user.id,
      endpoint: subscription.endpoint,
      subscription,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (body.action !== "notify" || !body.message_id) return json({ error: "Unsupported action" }, 400);
  if (!publicKey || !privateKey) return json({ error: "VAPID keys are not configured" }, 503);

  const admin = createClient(url, service);
  const { data: message, error: messageError } = await admin.from("messages")
    .select("id,room_id,sender_id,sender,body,kind,receiver_id")
    .eq("id", body.message_id).single();
  if (messageError || !message) return json({ error: "Message not found" }, 404);
  if (message.sender_id !== authData.user.id) return json({ error: "Not message sender" }, 403);
  if (!message.receiver_id || message.receiver_id === message.sender_id) return json({ ok: true, skipped: true });

  const { data: subs, error: subsError } = await admin.from("push_subscriptions")
    .select("id,subscription").eq("user_id", message.receiver_id);
  if (subsError) return json({ error: subsError.message }, 500);

  webpush.setVapidDetails("mailto:admin@kamrulhasanbd318-beep.github.io", publicKey, privateKey);
  const payload = JSON.stringify({
    title: message.sender || "New message",
    body: message.kind === "text" ? String(message.body).slice(0, 120) : "You received a new " + message.kind,
    url: "/messenger/?room=" + message.room_id,
    tag: "room-" + message.room_id,
  });
  const expired: number[] = [];
  const results = await Promise.all((subs || []).map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, payload);
      return true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) expired.push(row.id);
      return false;
    }
  }));
  if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
  return json({ ok: true, delivered: results.filter(Boolean).length, attempted: results.length });
});
