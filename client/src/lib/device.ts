export function getDeviceId(): string {
  // very simple fingerprint; in production use a library
  const raw = [
    navigator.userAgent,
    screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join('|');
  let hash = 0; for (let i=0;i<raw.length;i++){ hash = (hash*31 + raw.charCodeAt(i))|0; }
  return 'dev-' + Math.abs(hash).toString(36);
}
