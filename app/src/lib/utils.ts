export const uid = (prefix = 'l') =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const getDomain = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
};

export const faviconFor = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getDomain(url))}&sz=128`;

export const timeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

export const isImageDataUrl = (s: unknown): s is string =>
  typeof s === 'string' && s.startsWith('data:image/');
