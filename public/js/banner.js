const THEME_STORAGE_KEY = 'hospital-theme';
const THEMES = [
  {
    id: 'emerald',
    name: 'Emerald',
    palette: {
      50: '#eefdf4',
      100: '#d7f8e4',
      200: '#aaf0c7',
      300: '#75e4a6',
      400: '#3bd77f',
      500: '#12c969',
      600: '#0aa356',
      700: '#0a8147',
      800: '#0a653b',
      900: '#0a5433'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    palette: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    palette: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12'
    }
  },
  {
    id: 'violet',
    name: 'Violet',
    palette: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95'
    }
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  const placeholder = document.getElementById('banner');
  if (!placeholder) return;

  try {
    const res = await fetch('/banner.html');
    const html = await res.text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    const bannerEl = wrapper.firstElementChild;
    placeholder.replaceWith(bannerEl);

    ensureThemeStylesheet();
    initializeThemeControls(bannerEl);
  } catch (err) {
    console.error('Failed to load banner', err);
  }
});

function ensureThemeStylesheet() {
  if (document.getElementById('themeStyles')) return;
  const link = document.createElement('link');
  link.id = 'themeStyles';
  link.rel = 'stylesheet';
  link.href = '/css/theme.css';
  document.head.appendChild(link);
}

function initializeThemeControls(bannerEl) {
  const select = bannerEl.querySelector('[data-theme-select]');
  const swatchWrap = bannerEl.querySelector('[data-theme-swatches]');
  const current = getStoredTheme();

  if (select) {
    select.innerHTML = THEMES.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    select.value = current;
    select.addEventListener('change', (event) => {
      setTheme(event.target.value, bannerEl);
    });
  }

  if (swatchWrap) {
    swatchWrap.innerHTML = '';
    THEMES.forEach(theme => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.themeId = theme.id;
      btn.setAttribute('aria-label', `${theme.name} theme`);
      btn.className = 'theme-swatch';
      btn.style.backgroundColor = theme.palette[600];
      btn.addEventListener('click', () => {
        setTheme(theme.id, bannerEl);
      });
      swatchWrap.appendChild(btn);
    });
  }

  setTheme(current, bannerEl);
}

function setTheme(themeId, bannerEl) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  Object.entries(theme.palette).forEach(([shade, value]) => {
    root.style.setProperty(`--brand-${shade}`, value);
  });

  root.setAttribute('data-theme', theme.id);
  rememberTheme(theme.id);

  const select = bannerEl.querySelector('[data-theme-select]');
  if (select && select.value !== theme.id) {
    select.value = theme.id;
  }

  updateActiveSwatches(bannerEl, theme.id);
}

function updateActiveSwatches(bannerEl, activeId) {
  const swatches = bannerEl.querySelectorAll('[data-theme-id]');
  swatches.forEach((btn) => {
    const isActive = btn.dataset.themeId === activeId;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.classList.toggle('is-active', isActive);
  });
}

function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.some(t => t.id === saved)) return saved;
  } catch (err) {
    console.warn('Theme storage unavailable', err);
  }
  return THEMES[0].id;
}

function rememberTheme(themeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (err) {
    console.warn('Theme storage unavailable', err);
  }
}
