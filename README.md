# Selah Bible — Reading, Study, Reflection, and Offline Scripture

**Selah Multi Versions Bible (Selah MVB)** is a local-first, offline-capable multi-version Bible web application designed around editorial clarity, deep study, and daily spiritual rhythm.

## Key Capabilities

- **Personal Home & Reading Reminders**: A daily verse from the selected local Bible edition, one-tap resume to the last saved chapter, shortcuts to the main app sections, and optional device-local daily reminders with browser notifications or in-app fallback.
- **Bible Versions and Offline Reading**:
  - The **Berean Standard Bible (BSB)** and **King James Version (KJV)** are bundled for offline reading.
  - A multi-source catalog lets readers browse versions by name, abbreviation, or language. Availability and licensing vary by provider and translation.
  - The **Offline Vault (`IndexedDB`)** can download supported editions for offline use, show download progress, and import or export portable `.json` Bible files.
- **Synchronized Parallel Multi-Version Reader**:
  - Read 1, 2, or 3 Bible versions side-by-side in synchronized columns, or compare any selected verse across all installed & featured translations in the **Multi-Version Parallel Drawer**.
  - Navy-and-white light and rich-blue-on-black dark themes, optional sepia, custom background colors or personal images with an adjustable dim overlay, 4 font styles, adjustable text size, Verse-by-Verse or Flowing Prose modes, Red-Letter Words of Jesus, and translator footnotes.
- **Selah Bible Companion & Audio Read-Along**:
  - **Selah Bible Companion**: A local study helper that searches available Bible texts and curated notes, links responses to passages, and offers chapter guides, topical prompts, word notes, cross-references, quizzes, and sermon-outline support. It does not require a hosted AI service or API key; its explanations are study aids, not a substitute for Scripture or trusted pastoral guidance.
  - **Audio Read-Along**: Device speech synthesis with verse-following highlights, plus studio narration where available. Playback includes voice and speed controls, a sleep timer, and an optional ambient sound.
- **Structured Reading Plans & Custom Plan Builder**:
  - Includes 7 complete reading plans (*Whole Bible in 365 Days*, *New Testament in 90 Days*, *Walk With Jesus: Four Gospels in 30 Days*, *31 Days of Psalms & Proverbs*, *14-Day Story of Scripture*, *7-Day Peace for an Anxious Heart*, and *21-Day Paul's Letters*) plus a **Custom Reading Plan Generator** for any combination of books and days.
- **Kids Bible Story Trail**:
  - Child-friendly Bible-book journeys and story retellings with references, conversation prompts, simple activities, and prayers.
- **Daily Bible Reflection & Prayer Sanctuary**:
  - Daily devotional meditations rendered dynamically in your chosen Bible version, a **Heart Mood Compass**, guided 4-step *Lectio Divina* journaling, and a personal Prayer Sanctuary with answered-prayer tracking.
- **Bible Search, Study Notebook, Verse Art & Memory Deck**:
  - Search available Bible text, save highlights, bookmarks, and study notes, practice verse recall, track reading progress, and create shareable verse-art cards.

## Running Locally

```bash
npm install
npm run dev
```

## Mobile Apps (Apple App Store iOS & Google Play Store Android)

Selah MVB (`app.selahbible.multiversion`), formally Selah Multi Versions Bible, includes native **Capacitor 8** projects for both **iPhone/iPad (`ios/`)** and **Android (`android/`)**, plus full standalone PWA support for instant installation on iOS Safari and Android Chrome:

```bash
# Sync web build + custom launcher icons to native iOS & Android projects
npm run mobile:sync

# Open native Xcode project for Apple App Store archiving
npm run mobile:ios

# Open native Android Studio project for Google Play Store AAB/APK builds
npm run mobile:android
```

See [`MOBILE_PUBLISHING.md`](./MOBILE_PUBLISHING.md) and [`.github/workflows/mobile-builds.yml`](./.github/workflows/mobile-builds.yml) for automated cloud Android `.apk`/`.aab` and iOS Xcode builds.

