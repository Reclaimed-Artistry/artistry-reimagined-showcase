# Selah cloud sync, groups, and secure AI

## Cloud sync and reading groups

The web client uses the Supabase project configured in Vercel and the publishable browser key. The database migration is `supabase/migrations/202611060001_selah_cloud_sync_and_groups.sql`; it creates user-scoped study snapshots and shared reading-group tables with row-level security. The `join_reading_group` RPC accepts an invite code and adds the signed-in user without exposing a service-role credential to the browser.

Users opt in by creating an account or signing in from **Study → Sync & Groups**. Existing device data is merged with the cloud snapshot. Later edits auto-save after a short debounce; writes merge with the latest cloud snapshot and use an `updated_at` compare-and-swap retry so concurrent devices don't simply overwrite distinct edits. Deleted bookmarks, notes, highlights, prayers, and memory cards use synced deletion markers so a removed item is not reintroduced by another device. A JSON export/import remains available for manual transfer.

Public Vercel build variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the Supabase publishable key; safe to embed, with access controlled by RLS)

Never add a Supabase secret/service-role key to a `VITE_` variable or the client bundle.

## Secure server-side AI

`api/ai.ts` is a Vercel Node function. It requires a valid signed-in Supabase session, validates the bearer token against Supabase Auth, limits submitted context/history, and calls the configured OpenAI-compatible endpoint. The provider key is read only from server-side environment variables and is never sent to the client.

Configure these server variables in Vercel (Project → Settings → Environment Variables), then redeploy:

- `OPENAI_API_KEY` — required secret; set as an encrypted/sensitive variable, never with a `VITE_` prefix.
- `OPENAI_MODEL` — optional; defaults to `gpt-4o-mini`.
- `OPENAI_BASE_URL` — optional; defaults to OpenAI's Chat Completions endpoint.

Until `OPENAI_API_KEY` is configured, the secure AI mode reports that it is unavailable; built-in offline study tools continue to work. The API endpoint permits the production origin, local Vite origin, and the Vercel project's deployment aliases. If the Vercel account/team alias changes, update the origin matcher in `api/ai.ts`.

## Audio behavior

Audio uses browser speech synthesis or streams the Bible provider's studio narration. Media Session metadata and lock-screen controls are registered when the browser supports them. Sleep timer choices cycle through 15, 30, 45, and 60 minutes. Studio narration is not cached or offered as an offline download because third-party recording redistribution licenses are not verified.
