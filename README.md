# Selah Multi Versions Bible (Selah MVB) — Multi-Version Offline Scripture, Reading Plans, Daily Reflection & AI Companion

**Selah Multi Versions Bible (Selah MVB)** is a local-first, offline-capable multi-version Bible web application designed around editorial clarity, deep study, and daily spiritual rhythm.

## Key Capabilities

- **1,300+ Online & Downloadable Bible Versions Across 700+ Languages**:
  - **2 Complete 66-Book Starter Bibles Pre-Installed Offline**: **Berean Standard Bible (BSB)** and **King James Version (KJV)** work 100% offline immediately out of the box.
  - **Global Multi-Source Catalog**: Aggregates **Open Scripture Global CDN** (141 full Bibles including NIV, NKJV, ESV, NLT, NASB, AMP, CSB, WEB, Yoruba `OYCB`, Igbo `BIUO`, Hausa `BSRK`, Swahili `SUV`, Reina-Valera, Hebrew `WLC`, Greek `TR`/`LXX`, Latin Vulgate), **Bolls Open Bible Archive** (146 translations including MSG, NET, RSV, LSB, CJB, YLT), and **HelloAO Free Use Bible API** (1,256+ translations across 700+ languages).
  - **One-Click Full Offline Vault (`IndexedDB`)**: Download any translation once with live byte-level progress to read, compare, and search anytime without internet—plus portable `.json` export and custom `.json` Bible import.
- **Synchronized Parallel Multi-Version Reader**:
  - Read 1, 2, or 3 Bible versions side-by-side in synchronized columns, or compare any selected verse across all installed & featured translations in the **Multi-Version Parallel Drawer**.
  - Navy-and-white light and rich-blue-on-black dark themes, optional sepia, custom background colors or personal images with an adjustable dim overlay, 4 font styles, adjustable text size, Verse-by-Verse or Flowing Prose modes, Red-Letter Words of Jesus, and translator footnotes.
- **Embedded AI Bible Reading Companion & Audio Read-Along**:
  - **Selah Bible Knowledge Centre**: Local, sign-in-free study assistant that searches installed Bible editions, links answers to passages, and offers chapter walkthroughs, plain-language readings, book background, curated topical guides, selected Hebrew/Greek word notes, cross-references, guided prayers, quizzes, clarifying questions, and follow-up prompts. It can also prepare a topic-based sermon draft with a big idea, purpose, three-point outline, exposition, practical applications, Bible excerpts, and clickable references. It requires no hosted AI model or API key. Responses are grounded in available local texts and curated notes rather than generative-model output; more translations can be downloaded subject to their licenses.
  - **AI Voice & Studio Audio Read-Along**: Synchronized verse-by-verse read-aloud highlighting using neural/browser speech synthesis (works offline on every version) plus studio human audio MP3s where available, playback speed control, sleep timer, and a WebAudio contemplative ambient pad.
- **Structured Reading Plans & Custom Plan Builder**:
  - Includes 7 complete reading plans (*Whole Bible in 365 Days*, *New Testament in 90 Days*, *Walk With Jesus: Four Gospels in 30 Days*, *31 Days of Psalms & Proverbs*, *14-Day Story of Scripture*, *7-Day Peace for an Anxious Heart*, and *21-Day Paul's Letters*) plus a **Custom Reading Plan Generator** for any combination of books and days.
- **Kids Bible Story Trail**:
  - Child-friendly introductions to all **66 books** across both testaments, alongside featured retellings, Bible references, conversation prompts, simple activities, and prayers.
- **Daily Bible Reflection & Prayer Sanctuary**:
  - Daily devotional meditations rendered dynamically in your chosen Bible version, a **Heart Mood Compass**, guided 4-step *Lectio Divina* journaling, and a personal Prayer Sanctuary with answered-prayer tracking.
- **Full-Bible Instant Offline Search, Study Notebook, Verse Art & Memory Deck**:
  - `<35ms` full-Bible concordance search across all 31,102 verses with book distribution breakdown, 6-color verse highlighting, bookmarks, margin study notes, a **Progressive Cloze Memorization Trainer**, a **66-Book Completion Mosaic**, and a **Canvas Shareable Verse Art Card Studio**.

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

