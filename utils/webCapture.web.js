import html2canvas from 'html2canvas';

// Rasterizes a DOM node (typically a react-native-web View) to a PNG data
// URI. Metro's platform-extension resolver picks this file on web only, so
// html2canvas never gets bundled into the native APK. Scale of 2 gives
// retina-ish crispness while keeping the resulting PNG under ~300KB for a
// typical ShareCard-sized element.
export async function captureDomNode(node) {
  if (!node) throw new Error('No DOM node to capture');
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}
