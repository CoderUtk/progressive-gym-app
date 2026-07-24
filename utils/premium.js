// Central entitlement gate for Progressive.
//
// TODAY (pre-monetization): everything is unlocked. `isPremium()` returns true
// for every user and `canUse()` allows every feature, so nothing is paywalled.
//
// LATER (when Premium launches): point `_entitled` at a real entitlement —
// Google Play Billing / RevenueCat, mirrored to Supabase so it follows the
// account across devices — and move any feature you want to sell into the
// PREMIUM_ONLY set below. Because every screen reads its access through this
// one module, turning a feature paid becomes a one-line change here instead of
// a hunt across the codebase.
//
// Grandfathering note: when you do paywall, gate NEW/advanced features, or
// snapshot existing users as entitled, so nobody loses something they already
// had for free (that path leads to 1-star reviews). This module is where that
// policy will live.

// Stable keys for the features most likely to become Premium. Referencing a
// feature by key (not a scattered boolean) keeps the paywall logic in one map.
export const FEATURES = {
  MULTI_DEVICE_SYNC: 'multi_device_sync',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  TIME_MACHINE: 'time_machine',
  PLATEAU_DETECTION: 'plateau_detection',
  WEEKLY_AI_REVIEW: 'weekly_ai_review',
  UNLIMITED_ROUTINES: 'unlimited_routines',
};

// The single source of truth for "is this account entitled to Premium?".
// While pre-monetization this stays true for everyone. This is THE switch to
// wire to billing when Premium ships.
let _entitled = true;

export function isPremium() {
  return _entitled;
}

// Called once at startup (and after a purchase / restore) to set entitlement
// from the real billing/entitlement source. No-op-friendly: passing undefined
// leaves everyone entitled, which is the current, intentional behaviour.
export function setPremiumInMemory(value) {
  if (value === undefined) return;
  _entitled = !!value;
}

// Features currently sold behind Premium. EMPTY today → every feature is free.
// To paywall something later, add its FEATURES key here; non-premium users
// then get `false` from canUse() for that key while everything else stays free.
const PREMIUM_ONLY = new Set([
  // FEATURES.MULTI_DEVICE_SYNC,
  // FEATURES.TIME_MACHINE,
]);

// The gate every feature should call, e.g. `if (canUse(FEATURES.TIME_MACHINE))`.
// Free features (not in PREMIUM_ONLY) always return true; paywalled ones return
// true only for entitled users. Today this returns true for everything.
export function canUse(featureKey) {
  if (!PREMIUM_ONLY.has(featureKey)) return true;
  return isPremium();
}
