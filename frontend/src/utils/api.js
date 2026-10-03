export function getApiUrl(path) {
  const base = import.meta.env.VITE_API_URL || '';
  return path.startsWith('/') && base ? `${base.replace(/\/+$/, '')}${path}` : path;
}
