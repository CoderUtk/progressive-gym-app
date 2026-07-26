# Progressive — Post-v2 Roadmap

Next chapter after [`roadmap-post-v1.md`](./roadmap-post-v1.md) (v1.1–v1.4, all shipped:
streak calendar, records, milestones, Gym Mode, smart notifications).

Seven forward features plus two live bugs, sequenced by dependency and risk —
not necessarily the order they were requested in. See "Sequencing rationale"
at the bottom for why.

---

## Phase 0 — Stabilize (blocking predecessor, do first)

Before any roadmap item starts:

- **Commit outstanding v8 (1.0.2) fixes** — as of this writing, `git status`
  shows uncommitted changes to `AppRoot.js`, `GymMode.js`, `SettingsScreen.js`,
  `TemplateSelectScreen.js`, `WorkoutLoggerScreen.js`, `storage.js`, `app.json`.
- **Resume and finish the v8 Play Console submission** — release notes →
  preview → submit for review. Was mid-upload when this roadmap was written.
- **Confirm the back-button bug root cause** (see below) before attempting a
  second fix.
- **Investigate the failing GitHub Actions Supabase backup workflow** (see
  below) — this is the automated off-device backup, separate from the
  in-app `backupToCloud()` snapshot sync; if it's silently broken there may
  be no scheduled backup safety net right now.

### Bug: GitHub Actions Supabase backup workflow failing

Flagged as newly failing; not yet investigated. Task #13 ("Write GitHub
Actions backup workflow") was marked complete in an earlier session, but the
workflow file's current location/name wasn't re-confirmed when this roadmap
was written — first step is locating it (`.github/workflows/`) and reading
its last run logs in the GitHub Actions tab before diagnosing further.
Likely culprit categories once located: an expired/rotated Supabase service
key in repo secrets, a schema change the backup script doesn't handle, or a
runner/action version deprecation.

**Complexity: Small–Medium** (small if it's a stale secret; medium if the
backup script itself needs rework).

### Bug: back button missing on some screens (iOS Safari mobile)

Code inspection shows the existing fix (`AppRoot.js:83-86`, a `HeaderBackButton`
chevron set as `headerLeft` on every `Stack.Screen`) is structurally universal —
no screen overrides `headerLeft` individually, no nested navigator escapes it.
So "missing on **some** screens" likely isn't the header itself. Ranked
hypotheses:

| Hypothesis | Why it fits "some screens" | How to confirm |
|---|---|---|
| Modal-presented surfaces mistaken for "screens" | `GymMode`, `AddExerciseModal`, `PRModal`, `ShareCardModal`, `SessionEffortModal`, and the rename modal are `<Modal>`, not `Stack.Screen` — never had a chevron, use custom Exit/Close controls instead. If those are what's "missing," it's a different (positioning) bug. | Ask which exact screens; check if any of these six. |
| Safari cache serving a stale bundle | Safari aggressively caches SPA bundles; a user who loaded the app before the fix deployed may still run old JS until a hard refresh. | Compare bundle hash in Safari dev tools vs. current production hash. |
| Safe-area / notch clipping | Chevron sits at `paddingLeft: 12` inside the native-stack header; no native safe-area API on web — could render off-screen or under the URL bar on some device sizes. | Reproduce on an actual notched iPhone in Safari, not just a simulator. |

**Complexity: Small.**

---

## Phase 1 — Crash/error monitoring (Sentry or equivalent free tool)

Do this before other phases so it catches regressions they introduce.

**Sentry is not hard-set** — any comparable free/low-cost error-monitoring
tool works (e.g. Sentry, Bugsnag, Firebase Crashlytics, Highlight.io).
Sentry is the reference below because it has the most mature Expo/RN
support, but the choice is open; whichever is picked, the integration shape
is the same:

- Install the SDK's Expo config plugin, wrapped in the guarded-require
  pattern used elsewhere (`authClient.js:10-16`, `utils/notifications.js`)
  so a missing/misconfigured native module can't crash app startup.
- Separate DSN/API-key per environment (dev vs. production); source maps
  uploaded on release build (Gradle + EAS/manual build hook) if the tool
  supports symbolicated stack traces.
- Scrub PII before it reaches the service — no workout content, no raw
  email; align with the privacy policy already on file with Play.

**Complexity: Medium** (mostly config; native build wiring for source maps is
the fiddly part on this bare-workflow Android build, regardless of vendor).

**Open decision:** which tool. Free-tier limits (event volume, retention
window, seat count) are the deciding factor for a solo-maintained app —
worth a quick comparison before committing.

**Open decision:** Sentry account/org — needs to be created, DSN handed over
as a secret (goes in `app.json extra` / env, never committed).

---

## Phase 2 — Automated testing (safety net)

- Introduce `jest-expo` + `@testing-library/react-native` — **no existing
  test convention to mirror**; no jest config, no test script in
  `package.json`, no `__tests__` directories today.
- Start with pure-logic unit tests (highest value, lowest setup cost):
  `utils/progressiveOverload.js`, `utils/streaks.js`, `utils/records.js`,
  `utils/badges.js` / `milestones.js`, `utils/storage.js` template CRUD
  (including the delete-guardrail from the last session).
- Screen/component tests (RNTL) as a stretch goal once the unit layer is
  solid.
- Add `npm test`; no CI pipeline exists yet — out of scope unless requested.

**Complexity: Medium** for the harness + first 15-20 tests; small ongoing
cost per feature afterward.

---

## Phase 3 — Security audit

Do this before expanding auth surface (Phase 4) and before wiring real
payments (Phase 6), so findings shape both instead of retrofitting.

- Run the `security-review` skill / `security-reviewer` agent against:
  Supabase RLS policies, keystore/signing handling, OAuth redirect URIs,
  AsyncStorage of session tokens, and the account-deletion flow.
- Also worth a pass: `npm audit` — no CI currently catches a bad dependency
  upgrade.

**Complexity: Medium.** Output is a findings list; remediation effort
depends on what's found.

---

## Phase 4 — Facebook login

- Add `signInWithFacebook()` to `authClient.js`, mirroring
  `signInWithGoogle()` (`authClient.js:73-131`) exactly — same web-redirect
  vs. native `WebBrowser` branching.
- Register a Meta Developer app, enable Facebook as a provider in Supabase
  Auth, add Facebook App ID to `android/app/src/main/res/values/strings.xml`
  + `AndroidManifest.xml` if the native SDK is required (may not be, if the
  same OAuth-URL browser flow as Google works for Facebook too).
- Add a "Continue with Facebook" button next to Google's in `SignInScreen.js`.
- Update Play Console **Data Safety** to declare the new sign-in method.

**Complexity: Small–Medium** — small if the existing browser-redirect flow
works unchanged for Facebook; medium if Meta requires app review for scopes
beyond `public_profile`/`email`.

---

## Phase 5 — Professional icons (Milestones + Badges)

- Scope: `utils/badges.js` (24 entries) + `utils/milestones.js` + their
  render sites in `ProfileScreen.js`.
- **Not in scope** unless expanded later: emoji also appear in `nudges.js`
  (notification copy), `PRModal.js` / `AddExerciseModal.js` (celebratory
  flourishes), `data/exercises.js` — those read as intentional tone, not
  iconography.
- Use **MaterialCommunityIcons** (already bundled via `@expo/vector-icons`,
  zero new dependency) for achievement-specific glyphs Feather doesn't cover
  (trophy/rocket/mountain concepts), keeping Feather for structural UI.
- Re-theme with `colors.accent`/gold tint per the existing design system.

**Complexity: Small–Medium** — mechanical swap, but a few emoji (🔱, 🪐, …)
don't have obvious 1:1 vector equivalents and need a design call.

---

## Phase 6 — Paywall (entitlement infra + first paywalled features)

- `utils/premium.js` is already the right shape (`FEATURES`, `PREMIUM_ONLY`,
  `canUse()`) — this phase is: (a) wire `_entitled` to a real billing
  source, (b) decide which `FEATURES` move into `PREMIUM_ONLY`, (c) build a
  purchase/restore UI.
- **Open decision — billing integration:** raw Google Play Billing Library
  (more setup, no third-party fee) vs. **RevenueCat** (cross-platform
  receipt validation, less custom code, small % fee at scale). Leaning
  RevenueCat for a solo-maintained app pre-iOS-launch, but this is a call to
  confirm, not assume.
- Grandfather existing users per the comment already in `premium.js:13-16` —
  snapshot the current install base as entitled before flipping any feature
  to paid.

**Complexity: Large.** Biggest phase — billing integration, receipt
validation, restore-purchases, paywall UI, and grandfathering all touch
each other.

---

## Phase 7 — Ads

Sequenced after Phase 6 so ad display can gate on the same `isPremium()`
check (free tier = ads, premium = ad-free) — building ads first would mean
redoing the gating logic once paywall lands.

- `react-native-google-mobile-ads` (maintained AdMob binding; `expo-ads-admob`
  is deprecated) via guarded require, same defensive pattern as
  `authClient.js`.
- Needs: AdMob account + app registration, ad unit IDs, **Google UMP SDK**
  for GDPR/consent (EU users), and updating the Play Console **Ads**
  declaration.
- Placement: banner on a low-friction screen (Dashboard or Analytics) to
  start; avoid interstitials during an active workout — bad for retention
  on a fitness app specifically.

**Complexity: Medium.**

---

## Sequencing rationale

Original request order was: Ads → Sentry → Facebook → Icons → Paywall →
Testing → Security audit. Reordered because:

- **Testing and Sentry first** — every later phase benefits from a safety
  net; building them last means Phases 3-7 ship without one.
- **Security audit before Facebook login and paywall** — both expand attack
  surface (new OAuth provider, real payment data); auditing after is
  retrofitting.
- **Paywall before Ads** — ads need to know who's premium to skip showing
  them; building ads first means re-touching that code once paywall lands.
- **Icons** has no dependencies — the most flexible slot, could move
  anywhere including first for a quick visible win.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| RevenueCat vs. Play Billing choice locks in significant rework if wrong | Medium | Confirm before Phase 6 starts, not mid-build |
| Sentry source-map upload breaks the bare-workflow Gradle build | Medium | Test on a throwaway versionCode before wiring into the real release pipeline |
| Meta app review blocks Facebook login if scopes exceed `public_profile`/`email` | Low–Medium | Request minimal scopes first |
| 24 badge emoji don't all have clean vector equivalents | Low | Flag ambiguous ones for sign-off rather than guessing |
| No CI means Phase 2's tests can silently rot | Medium | Worth a follow-up "add CI" item once Phase 2 lands |
