# Selah Bible — Apple App Store (iOS) & Google Play Store (Android) Guide

Selah Bible (`app.selahbible.multiversion`) is packaged as both:
1. **A Native Capacitor 8 iOS & Android App** (`ios/` Xcode project + `android/` Gradle project) ready for **Apple App Store Connect** and **Google Play Console**.
2. **An Installable Offline-First Mobile App (PWA)** that works immediately on **iPhones, iPads, and Android phones** via Vercel HTTPS with zero store wait time.

---

## 1. Use Immediately on Any iPhone or Android Phone

Visit the live Vercel deployment on your phone:
- **On iPhone / iPad (Safari)**: Tap **Share** (`↑`) → **Add to Home Screen** → **Add**. Launches full-screen with Dynamic Island / Home Indicator safe-area support and 100% offline BSB + KJV Bibles.
- **On Android (Chrome / Samsung Internet / Edge)**: Tap the **iOS & Android** button in the top bar → **Install Selah Bible App Now** (or browser menu `⋮` → **Install app**).

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
   - **Data Safety**: Selah Bible stores highlights, notes, reading plans, and offline Bibles locally on-device (`No user data collected or shared with third parties`).

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
