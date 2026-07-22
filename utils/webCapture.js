// Native stub — DOM capture is web-only. Metro auto-picks webCapture.web.js
// on web platform, so this file only ends up in native bundles where the
// consumer should be routed to react-native-view-shot instead.
export async function captureDomNode() {
  throw new Error('captureDomNode is web-only; use ViewShot on native');
}
