# Messenger direct chat and Android push setup

The website code and Supabase Edge Function source are in this repository. The remaining server-side activation must be performed in the Supabase project because GitHub Pages cannot deploy Supabase database migrations or Edge Functions.

## 1. Apply database migration

Open Supabase Dashboard → SQL Editor and run the complete contents of `messenger/direct-chat-push-setup.sql`.

This adds recipient-only messages and per-device push subscriptions. Run it after the existing `messenger/secure-setup.sql`.

## 2. Deploy the push function

From the repository root, with Supabase CLI linked to project `zmvmpfvlrmtiizbyjoln`:

```sh
supabase functions deploy messenger-push
supabase secrets set VAPID_PRIVATE_KEY="<private VAPID key supplied by the site owner>"
```

Supabase provides SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to Edge Functions. Do not put the service-role key in browser code or GitHub.

## 3. Enable notifications on each phone

Each person must open the Messenger page on their Android browser, connect to the same invite room, and tap **Enable notifications**. Accept the browser permission prompt. Each device stores its own push subscription.

## Notes

- Push delivery requires Android Chrome (or another browser with Web Push support), HTTPS, and permission granted by that user.
- The app sends a notification to the selected recipient after a direct message is saved.
- If a user changes browser/device, enable notifications again on the new device.
- iOS browser support and delivery behavior differ; this setup targets Android as requested.
