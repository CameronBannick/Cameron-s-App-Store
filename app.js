// Cameron's App Store — front-end logic
// Loads catalog.json, renders app cards, handles search/categories,
// and shows a detail sheet with the APK download (sideload) flow.

const state = {
  apps: [],
  filtered: [],
  category: 'All',
  query: '',
};

const el = (sel) => document.querySelector(sel);
const grid = el('#grid');

async function loadCatalog() {
  try {
    const res = await fetch('catalog.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('catalog ' + res.status);
    const data = await res.json();
    state.apps = (data.apps || []).slice().sort(byUpdatedDesc);
  } catch (err) {
    console.error('Could not load catalog.json', err);
    state.apps = [];
  }
  enrichSizes();
  buildCategories();
  apply();
}

function byUpdatedDesc(a, b) {
  return String(b.updated || '').localeCompare(String(a.updated || ''));
}

// Try to read the real APK size with a HEAD request so the catalog
// doesn't have to hard-code it. Falls back to whatever's in the catalog.
async function enrichSizes() {
  await Promise.all(
    state.apps.map(async (app) => {
      if (app.size || !app.apk) return;
      try {
        const res = await fetch(app.apk, { method: 'HEAD' });
        const len = res.headers.get('content-length');
        if (len) app.size = formatBytes(Number(len));
      } catch (_) { /* ignore — offline or HEAD blocked */ }
    })
  );
  // Re-render if a sheet/card is visible so sizes appear once known.
  apply();
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return mb.toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function buildCategories() {
  const cats = ['All', ...new Set(state.apps.map((a) => a.category).filter(Boolean))];
  const nav = el('#categories');
  nav.innerHTML = '';
  cats.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (cat === state.category ? ' active' : '');
    chip.textContent = cat;
    chip.onclick = () => { state.category = cat; buildCategories(); apply(); };
    nav.appendChild(chip);
  });
}

function apply() {
  const q = state.query.trim().toLowerCase();
  state.filtered = state.apps.filter((a) => {
    const inCat = state.category === 'All' || a.category === state.category;
    const inQuery = !q ||
      [a.name, a.tagline, a.description, a.category]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    return inCat && inQuery;
  });
  render();
}

function render() {
  grid.innerHTML = '';
  const count = state.apps.length;
  el('#appCount').textContent =
    count === 0 ? 'No apps yet' : `${count} app${count === 1 ? '' : 's'} · tap to install`;

  el('#emptyState').hidden = count !== 0;

  state.filtered.forEach((app) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.onclick = () => openSheet(app);

    const meta = [app.version && 'v' + app.version, app.size, app.category]
      .filter(Boolean).join('  ·  ');

    card.innerHTML = `
      <img class="card-icon" src="${app.icon || 'icons/placeholder.svg'}" alt="" loading="lazy"
           onerror="this.src='icons/placeholder.svg'" />
      <div class="card-body">
        <h3 class="card-title"></h3>
        <p class="card-tag"></p>
        <p class="card-meta"></p>
      </div>
      <button class="get-btn" type="button">GET</button>
    `;
    card.querySelector('.card-title').textContent = app.name || app.id;
    card.querySelector('.card-tag').textContent = app.tagline || '';
    card.querySelector('.card-meta').textContent = meta;
    grid.appendChild(card);
  });
}

function openSheet(app) {
  const sheet = el('#sheet');
  el('#sheetIcon').src = app.icon || 'icons/placeholder.svg';
  el('#sheetIcon').onerror = function () { this.src = 'icons/placeholder.svg'; };
  el('#sheetTitle').textContent = app.name || app.id;
  el('#sheetMeta').textContent =
    [app.version && 'Version ' + app.version, app.size, app.category, app.updated && 'Updated ' + app.updated]
      .filter(Boolean).join('  ·  ');
  el('#sheetDesc').textContent = app.description || app.tagline || '';

  const shots = el('#sheetShots');
  shots.innerHTML = '';
  (app.screenshots || []).forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = app.name + ' screenshot';
    img.loading = 'lazy';
    shots.appendChild(img);
  });

  const installBtn = el('#sheetInstall');
  if (app.apk) {
    installBtn.href = app.apk;
    installBtn.textContent = `Download APK${app.size ? ' · ' + app.size : ''}`;
    installBtn.style.opacity = '1';
    installBtn.style.pointerEvents = 'auto';
  } else {
    installBtn.removeAttribute('href');
    installBtn.textContent = 'No APK attached yet';
    installBtn.style.opacity = '0.5';
    installBtn.style.pointerEvents = 'none';
  }

  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheets() {
  el('#sheet').hidden = true;
  el('#helpModal').hidden = true;
  document.body.style.overflow = '';
}

// Wire up close buttons / backdrops
document.querySelectorAll('[data-close]').forEach((node) => {
  node.addEventListener('click', closeSheets);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheets();
});

// Search
el('#search').addEventListener('input', (e) => {
  state.query = e.target.value;
  apply();
});

// Help link
el('#helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  el('#helpModal').hidden = false;
  document.body.style.overflow = 'hidden';
});

// PWA install prompt for the store itself
let deferredPrompt = null;
const installStoreBtn = el('#installStoreBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installStoreBtn.hidden = false;
});
installStoreBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installStoreBtn.hidden = true;
});

// Register service worker (offline shell + installability)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

loadCatalog();
