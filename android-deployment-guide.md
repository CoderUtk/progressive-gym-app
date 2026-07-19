# Deploying "Progressive" to Android — Step-by-Step Guide

Keep this for later. Follow it once the app itself is in good shape.

---

## 0. Prerequisites (one-time)

- Node.js 18+ installed
- A free Expo account: [expo.dev/signup](https://expo.dev/signup)
- Your `progressive-app` project folder, unzipped, with `npm install` already run

---

## 1. Install the EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

## 2. Link the project to your Expo account

Run this from inside the `progressive-app` folder:

```bash
cd progressive-app
eas build:configure
```

This confirms/updates `eas.json` (already included in the project) and links
the project to your Expo account.

## 3. Build a quick APK to test on your own phone / share with others

```bash
eas build --platform android --profile preview
```

- Runs in Expo's cloud (takes a few minutes)
- Gives you a **download link** for a `.apk` file when done
- Install it on any Android phone: download the file, tap it, and allow
  "install unknown apps" if prompted
- No Google Play account needed for this step — good for testing with
  friends, a gym buddy, etc.

## 4. When you're ready for the Play Store

### a. Create a Google Play Console account
- One-time $25 fee: [play.google.com/console](https://play.google.com/console)

### b. Build a production AAB (Play Store's required format)

```bash
eas build --platform android --profile production
```

### c. Submit it

Either:
- **Manually**: download the `.aab` from the EAS build page and upload it
  yourself in the Play Console, or
- **Automated**:
  ```bash
  eas submit --platform android
  ```
  (First time, this asks for a service account JSON key — the Play Console
  walks you through generating one under Setup → API access.)

### d. Fill out the store listing

Play Console will require:
- App icon (already in `assets/icon.png`)
- Feature graphic (1024×500) — not included yet, make one before this step
- At least 2 phone screenshots
- Short description (80 chars) + full description (4000 chars)
- Privacy policy URL — required even if the app collects no data; a single
  hosted page stating "this app stores workout data locally on your device
  and collects no personal information" is enough if that's still accurate
- Content rating questionnaire (a few clicks, no cost)

### e. Submit for review

- First-time app review typically takes a few hours to a couple of days
- You'll get an email when it's approved or if changes are requested

---

## Before your first Play Store build, double-check

- [ ] `com.progressive.app` (in `app.json` → `android.package`) is still
      available — search for it in the Play Console; package names are
      globally unique and can't be changed after first upload
- [ ] `version` and `android.versionCode` in `app.json` are bumped for each
      new release (`versionCode` must always increase)
- [ ] Real icon/splash images have replaced the placeholders, if you want
      final branding before the public release
- [ ] You've tested the **preview APK** (step 3) on a real device first

---

## Quick reference

| Goal | Command |
|---|---|
| Test on your own device via Expo Go (no build) | `npx expo start` |
| Shareable APK, no Play Store | `eas build --platform android --profile preview` |
| Play Store release build | `eas build --platform android --profile production` |
| Submit to Play Store | `eas submit --platform android` |
