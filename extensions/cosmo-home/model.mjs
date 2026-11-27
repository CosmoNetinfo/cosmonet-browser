export const THEMES = ['system', 'light', 'dark', 'sand'];
export const ENGINES = Object.freeze({
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q='
});
export const DEFAULTS = Object.freeze({
  theme: 'system', accent: '#53694e', engine: 'duckduckgo',
  links: [{ name: 'CosmoNet', url: 'https://www.cosmonet.info/' }]
});

export function safeWebUrl(input) {
  if (typeof input !== 'string' || input.length > 4096) return null;
  const value = input.trim();
  if (!value || /[\u0000-\u0020\u007f]/u.test(value)) return null;
  try {
    const url = new URL(/^[a-z][\w+.-]*:/i.test(value) ? value : `https://${value}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function normalizeSettings(value) {
  const settings = value && typeof value === 'object' ? value : {};
  const links = Array.isArray(settings.links) ? settings.links : DEFAULTS.links;
  return {
    theme: THEMES.includes(settings.theme) ? settings.theme : DEFAULTS.theme,
    accent: /^#[0-9a-f]{6}$/i.test(settings.accent ?? '') ? settings.accent : DEFAULTS.accent,
    engine: Object.hasOwn(ENGINES, settings.engine) ? settings.engine : DEFAULTS.engine,
    links: links.flatMap(link => {
      const url = safeWebUrl(link?.url);
      return url && typeof link?.name === 'string' && link.name.trim()
        ? [{ name: link.name.trim().slice(0, 50), url }] : [];
    }).slice(0, 12)
  };
}

export function searchUrl(query, engine) {
  const text = String(query).trim();
  if (!text) return null;
  return (ENGINES[engine] ?? ENGINES.duckduckgo) + encodeURIComponent(text);
}

export function createSettingsStore(storage) {
  let pending = Promise.resolve();
  return {
    async load() {
      await pending;
      const result = await storage.get('cosmoHome');
      return normalizeSettings(result.cosmoHome);
    },
    save(settings) {
      const normalized = normalizeSettings(settings);
      const write = pending.then(() => storage.set({ cosmoHome: normalized }));
      pending = write.catch(() => {});
      return write.then(() => normalized);
    }
  };
}
