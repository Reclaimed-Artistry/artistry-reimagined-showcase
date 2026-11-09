# Selah Multi Versions Bible (Selah MVB) — Apple App Store (iOS) & Google Play Store (Android) Guide

Selah Multi Versions Bible (Selah MVB) (`app.selahbible.multiversion`) is packaged as both:
1. **A Native Capacitor 8 iOS & Android App** (`ios/` Xcode project + `android/` Gradle project) ready for **Apple App Store Connect** and **Google Play Console**.
2. **An Installable Offline-First Mobile App (PWA)** that works immediately on **iPhones, iPads, and Android phones** via Vercel HTTPS with zero store wait time.

---

## 1. Use Immediately on Any iPhone or Android Phone

Visit the live Vercel deployment on your phone:
- **On iPhone / iPad (Safari)**: Tap **Share** (`↑`) → **Add to Home Screen** → **Add**. Launches full-screen with Dynamic Island / Home Indicator safe-area support and 100% offline BSB + KJV Bibles.
- **On Android (Chrome / Samsung Internet / Edge)**: Tap the **iOS & Android** button in the top bar → **Install Selah MVB App Now** (or browser menu `⋮` → **Install app**).

---

## 2. Publish to Google Play Store (Android `.aab` & `.apk`)

### Option A — Automated Cloud Build (No Local Setup Needed)
1. Open your GitHub repository → **Actions** tab → **Build iOS (App Store) & Android (Play Store) Mobile Apps** → click **Run workflow**.
2. Download **`selah-bible-android-apk`** (to side-load and test directly on any Android phone) or **`selah-bible-play-store-aab`** (for Google Play Console).

### Option B — Local Build in Android Studio
```bash
npm install
npm run mobile:android
```
Inside Android Studio:
1. Choose **Build → Generate Signed App Bundle / APK…** → select **Android App Bundle (`.aab`)**.
2. Create or select your upload keystore (`.jks`), choose **release**, and build `app-release.aab`.
3. Upload `app-release.aab` in [Google Play Console](https://play.google.com/console) under **Production → Create new release**.
   - **Data Safety**: Selah MVB stores highlights, notes, reading plans, and offline Bibles locally on-device (`No user data collected or shared with third parties`).

---

## 3. Publish to Apple App Store (iPhone & iPad)

Requires a Mac with **Xcode 16+** and an **Apple Developer Program** account:

```bash
npm install
npm run mobile:ios
```

Inside Xcode (`ios/App/App.xcodeproj`):
1. Select the **App** target → **Signing & Capabilities** → select your **Apple Developer Team** and verify Bundle Identifier `app.selahbible.multiversion` (or set your custom reverse-DNS bundle ID).
2. Apple's mandatory **Privacy Manifest (`ios/App/App/PrivacyInfo.xcprivacy`)** and **1024×1024 opaque App Store icon (`AppIcon-512@2x.png`)** are already configured and included.
3. Choose destination **Any iOS Device (arm64)** → **Product → Archive**.
4. In the Organizer window, click **Distribute App → App Store Connect → Upload**, then submit for review in [App Store Connect](https://appstoreconnect.apple.com).

## AI reading voices in the native apps

Android System WebView does not implement the Web Speech API: inside the
Capacitor app `window.speechSynthesis` is `undefined`. The read-along voice
therefore goes through `@capacitor-community/text-to-speech`, which speaks with
the operating system engine (Android TextToSpeech, iOS AVSpeechSynthesizer).
The browser build keeps using Web Speech.

`src/lib/nativeSpeech.ts` owns that split, and `src/lib/speechVoices.ts` feeds
the voice picker from the platform in use. Voices come from the device, so the
available languages, names, and male/female options depend on what the phone has
installed.

Rebuild steps after changing anything native:

```bash
npm install
npx cap sync android   # regenerates capacitor.build.gradle + capacitor.settings.gradle
```

Then rebuild in Android Studio. `cap sync` is what registers the plugin with
Gradle; skipping it leaves JS calls failing with "not implemented" and the
audio bar showing "Rebuild the Android app so the Text-to-speech plugin is
included."

On a device with no speech engine or no voice for the selected Bible language,
the audio bar names the problem and offers an "Open Text-to-speech settings"
shortcut instead of a play button that silently does nothing.

### The app's own AI voices (Android)

The device engine is only as good as the voice pack the phone happens to have,
and many phones ship nothing but the robotic compact voice. So on Android the
read-along offers two narrators the app owns — **Onyx (male)** and
**Nova (female)** — synthesised by [Puter.js](https://js.puter.com/v2/), listed
above the device voices in the picker and used by default.

`src/lib/puterVoice.ts` owns that path and is gated on
`Capacitor.getPlatform() === "android"`, so the web app never downloads the SDK
and never defines `window.puter`. The script is injected lazily by adding a
`<script src="https://js.puter.com/v2/">` tag, which also means the production
Content-Security-Policy (if one is ever added) must allow
`https://js.puter.com` in `script-src`.

**A data connection is required.** Every verse is synthesised in the cloud, so
the audio bar states that plainly and, when the connection is missing, offers a
**Retry AI voice** button that picks the chapter back up from the current verse.
Nothing is pre-cached: replaying an offline chapter uses the device engine.

The **first use on a device needs a one-time Puter sign-in**. Puter opens it with
`window.open()`, and the Android System WebView refuses that call unless the app
answers `WebChromeClient.onCreateWindow` — which is why `MainActivity.java`
overrides it and shows the sign-in in a dialog. Without that override the popup
returns `null`, the sign-in never appears, and the AI voice fails with a
sign-in notice. `MainActivity` extends Capacitor's own `BridgeWebChromeClient`
so file pickers, permission prompts, and JavaScript dialogs keep working, and
any pop-up URL outside `puter.com` is handed to the device browser.

If the AI voice fails for any reason (no data, timeout, sign-in cancelled,
allowance spent), the chapter **continues on the device engine for the very
verse that failed** and the bar explains what happened. The fallback is never
silence, and the reader's saved narrator choice is not overwritten by a
transient failure.
