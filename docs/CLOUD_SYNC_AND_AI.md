# Selah cloud sync, groups, and Bible Companion

## Cloud sync and reading groups

The web client uses the Supabase project configured in Vercel and the publishable browser key. The database migration is `supabase/migrations/202611060001_selah_cloud_sync_and_groups.sql`; it creates user-scoped study snapshots and shared reading-group tables with row-level security. The `join_reading_group` RPC accepts an invite code and adds the signed-in user without exposing a service-role credential to the browser.

Users opt in by creating an account or signing in from **Study → Sync & Groups**. Existing device data is merged with the cloud snapshot. Later edits auto-save after a short debounce; writes merge with the latest cloud snapshot and use an `updated_at` compare-and-swap retry so concurrent devices don't simply overwrite distinct edits. Deleted bookmarks, notes, highlights, prayers, and memory cards use synced deletion markers so a removed item is not reintroduced by another device. A JSON export/import remains available for manual transfer.

Public Vercel build variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the Supabase publishable key; safe to embed, with access controlled by RLS)

Never add a Supabase secret/service-role key to a `VITE_` variable or the client bundle.

## Selah Bible Companion

Selah Bible Companion is a local, retrieval-based Bible study assistant. It does not call OpenAI or another hosted language model, has no provider API key, and does not require sign-in. Its evidence comes from complete Bible editions bundled with the app (KJV and BSB), any full translations the user has downloaded/imported on that device, the visible chapter, canonical book metadata, curated topical reading paths, cross-references, and selected Hebrew/Greek word-study notes. It links relevant references back to the reader and preserves recent conversation turns for follow-up searches.

The companion searches only translations available locally on that device; copyrighted editions are not redistributed by Selah and may remain publisher-hosted or require the user to obtain/download an authorized copy. Original-language material is a curated study aid, not a complete scholarly lexicon. Sermon requests use curated frameworks for common themes and local verse matching for other topics to prepare a big idea, purpose, three-point outline, exposition, application, and linked Bible portions. When no close topical match exists, the draft identifies that limitation and uses the current reading only as a clearly labeled starting point. Because this is a deterministic local study/search engine rather than a generative language model, answers are grounded in retrieved Bible text and study notes; it does not claim that every modern subject is directly addressed by a selected passage.

Account sign-in remains available separately under **Study → Sync & Groups** for optional cloud backup and shared reading plans. It is not used by the local Selah Bible Companion. No OpenAI provider key is needed or stored in Vercel.

## Audio behavior

Audio uses browser speech synthesis or streams the Bible provider's studio narration. Media Session metadata and lock-screen controls are registered when the browser supports them. Sleep timer choices cycle through 15, 30, 45, and 60 minutes. Studio narration is not cached or offered as an offline download because third-party recording redistribution licenses are not verified.
