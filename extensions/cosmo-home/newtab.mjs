import { createSettingsStore, safeWebUrl, searchUrl } from './model.mjs';

const $ = id => document.getElementById(id);
const store = createSettingsStore(chrome.storage.local);
let settings;
let busy = false;

function report(message) { $('status').textContent = message; }
function render() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--accent', settings.accent);
  for (const key of ['theme', 'engine', 'accent']) $(key).value = settings[key];
  const names = { duckduckgo: 'DuckDuckGo', google: 'Google', bing: 'Bing' };
  $('search-provider').textContent = `Ricerca con ${names[settings.engine]}`;
  $('shortcuts').replaceChildren();
  $('editable-links').replaceChildren();
  settings.links.forEach((link, index) => {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    const initial = document.createElement('span');
    initial.className = 'shortcut-initial';
    initial.textContent = [...link.name][0].toLocaleUpperCase();
    initial.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'shortcut-name';
    name.textContent = link.name;
    anchor.append(initial, name);
    $('shortcuts').append(anchor);
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = link.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Rimuovi';
    remove.setAttribute('aria-label', `Rimuovi ${link.name}`);
    remove.addEventListener('click', () => commit({ ...settings,
      links: settings.links.filter((_, i) => i !== index) }));
    row.append(label, remove);
    $('editable-links').append(row);
  });
}

async function commit(next) {
  if (busy) return false;
  busy = true;
  document.querySelectorAll('#settings input, #settings select, #settings form button, #editable-links button')
    .forEach(element => { element.disabled = true; });
  try {
    settings = await store.save(next);
    render();
    report('Salvato sul dispositivo.');
    return true;
  } catch {
    render();
    report('Salvataggio non riuscito. Riprova.');
    return false;
  } finally {
    busy = false;
    document.querySelectorAll('#settings input, #settings select, #settings form button, #editable-links button')
      .forEach(element => { element.disabled = false; });
  }
}

$('open-settings').addEventListener('click', () => $('settings').showModal());
$('close-settings').addEventListener('click', () => $('settings').close());
for (const key of ['theme', 'engine', 'accent']) {
  $(key).addEventListener('change', event => {
    if (settings) commit({ ...settings, [key]: event.target.value });
  });
}
$('search-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!settings) return;
  const url = searchUrl($('search').value, settings.engine);
  if (url) window.location.assign(url);
});
$('link-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!settings || busy) return;
  if (settings.links.length >= 12) return report('Puoi aggiungere fino a 12 collegamenti.');
  const url = safeWebUrl($('link-url').value);
  const name = $('link-name').value.trim();
  if (!url || !name) return report('Inserisci un nome e un indirizzo http o https valido.');
  if (await commit({ ...settings, links: [...settings.links, { name, url }] })) $('link-form').reset();
});

try {
  settings = await store.load();
  render();
} catch {
  $('open-settings').disabled = true;
  $('search-provider').textContent = 'Preferenze non disponibili. Riapri la scheda per riprovare.';
}
