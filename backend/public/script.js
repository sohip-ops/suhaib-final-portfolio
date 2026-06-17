/**
 * script.js — Suhaib Photo · Homepage
 *
 * Social links:
 *  - WhatsApp  → window.location.href (same tab, exits to WhatsApp app/web)
 *  - Instagram → window.location.href (same tab, exits to Instagram)
 *  - Both URLs are dynamically fetched from /api/settings and fully
 *    normalised to https:// before being set.
 */
'use strict';

const API_BASE = '';

// ─────────────────────────────────────────────────────────
//  Language data
// ─────────────────────────────────────────────────────────
let isArabic = (localStorage.getItem('sp_lang') || 'ar') === 'ar';

const translations = {
  ar: {
    siteName:      'صهيب فوتو',
    heroLine1:     '..جودة بصرية تليق بك',
    heroLine2:     'حكايات ترويها العدسة',
    drawerTitle:   'تواصل معنا',
    viewPortfolio: 'عرض المعرض',
    navAll:        'الكل',
  },
  en: {
    siteName:      'Suhaib Photo',
    heroLine1:     'Visual quality you deserve..',
    heroLine2:     'Stories told through the lens',
    drawerTitle:   'Contact Us',
    viewPortfolio: 'View Portfolio',
    navAll:        'All',
  }
};

// ─────────────────────────────────────────────────────────
//  Init on load
// ─────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  hideSkeleton();
  fetchSettings();
  fetchPanels();

  // Desktop nav links → built dynamically by fetchCategories()
  fetchCategories();

  // Hamburger
  document.getElementById('hamburger-btn')
    ?.addEventListener('click', toggleDrawer);
});

// ─────────────────────────────────────────────────────────
//  Skeleton loader
// ─────────────────────────────────────────────────────────
function hideSkeleton() {
  const skeleton = document.getElementById('skeleton-loader');
  const main     = document.getElementById('main-content');
  if (!skeleton || !main) return;
  setTimeout(() => {
    skeleton.style.transition = 'opacity 0.5s ease';
    skeleton.style.opacity    = '0';
    setTimeout(() => {
      skeleton.style.display = 'none';
      main.style.opacity     = '1';
    }, 500);
  }, 700);
}

// ─────────────────────────────────────────────────────────
//  URL normalisers
// ─────────────────────────────────────────────────────────

/** Accept raw number ("966512345678", "+966 51…") or full https:// URL */
function buildWhatsAppUrl(value) {
  const v = String(value || '').trim();
  if (!v) return 'https://wa.me/966500000000';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://wa.me/${v.replace(/[^0-9]/g, '')}`;
}

/** Accept "@handle", "instagram.com/…", or full https:// URL */
function buildInstagramUrl(value) {
  let v = String(value || '').trim();
  if (!v) return 'https://instagram.com/suhaibphoto';
  if (/^https?:\/\//i.test(v)) return v;
  v = v.replace(/^@/, '');
  if (/^instagram\.com/i.test(v)) return `https://${v}`;
  return `https://instagram.com/${v}`;
}

// ─────────────────────────────────────────────────────────
//  Wire a social button:
//  - Clicking navigates the current tab OUT of the site
//    (same-window redirect — works on mobile WhatsApp deep links)
//  - The <a> href is also set as fallback for right-click / copy
// ─────────────────────────────────────────────────────────
function wireSocialButton(id, url) {
  const el = document.getElementById(id);
  if (!el || !url) return;

  // Set href so right-click "Copy link" works
  el.href = url;
  // Remove any prior listeners by cloning
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);

  clone.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = url;   // same-tab redirect → exits the site
  });
}

// ─────────────────────────────────────────────────────────
//  Settings  — fetch from API, wire social buttons
// ─────────────────────────────────────────────────────────
async function fetchSettings() {
  let waUrl = 'https://wa.me/966500000000';
  let igUrl = 'https://instagram.com/suhaibphoto';

  try {
    const data = await apiFetch('/api/settings');
    if (data.whatsapp)  waUrl = buildWhatsAppUrl(data.whatsapp);
    if (data.instagram) igUrl = buildInstagramUrl(data.instagram);

    // Arabic hero text from DB — overrides hardcoded defaults
    if (data.hero_text_ar) translations.ar.heroLine1 = data.hero_text_ar;
    if (data.hero_sub_ar)  translations.ar.heroLine2 = data.hero_sub_ar;
    // English hero text from DB — overrides hardcoded defaults reactively
    if (data.hero_text_en) translations.en.heroLine1 = data.hero_text_en;
    if (data.hero_sub_en)  translations.en.heroLine2 = data.hero_sub_en;
    // Always refresh DOM with the value for whichever language is currently active
    applyHeroText();
  } catch {
    /* use defaults defined above */
  }

  wireSocialButton('whatsapp-link',  waUrl);
  wireSocialButton('instagram-link', igUrl);
}

// ─────────────────────────────────────────────────────────
//  Homepage background panels
// ─────────────────────────────────────────────────────────
const FALLBACK_PANELS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
];

async function fetchPanels() {
  let panels = [];
  try { panels = await apiFetch('/api/panels'); } catch { panels = []; }

  const left  = document.getElementById('left-panels');
  const right = document.getElementById('right-panels');
  if (!left || !right) return;

  const leftSrcs  = panels.filter(p => p.position.startsWith('left')).map(p => p.media_url);
  const rightSrcs = panels.filter(p => p.position.startsWith('right')).map(p => p.media_url);
  const lSrcs = leftSrcs.length  ? leftSrcs  : FALLBACK_PANELS.slice(0, 2);
  const rSrcs = rightSrcs.length ? rightSrcs : FALLBACK_PANELS.slice(2, 4);

  left.innerHTML  = lSrcs.map(src =>
    `<div class="side-panel flex-1 rounded-xl overflow-hidden"><img src="${src}" alt="" loading="lazy" draggable="false"></div>`
  ).join('');
  right.innerHTML = rSrcs.map(src =>
    `<div class="side-panel flex-1 rounded-xl overflow-hidden"><img src="${src}" alt="" loading="lazy" draggable="false"></div>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
//  Flash effect
// ─────────────────────────────────────────────────────────
function triggerFlash() {
  const camera = document.getElementById('camera-container');
  if (!camera) return;

  let flashEl = document.getElementById('camera-flash-burst');
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.id = 'camera-flash-burst';
    camera.style.position = 'relative';
    camera.appendChild(flashEl);
  }
  flashEl.classList.remove('active');
  void flashEl.offsetWidth;
  flashEl.classList.add('active');

  camera.classList.remove('flash-click');
  void camera.offsetWidth;
  camera.classList.add('flash-click');
  camera.addEventListener('animationend', () => {
    camera.classList.remove('flash-click');
  }, { once: true });
}

// ─────────────────────────────────────────────────────────
//  Drawer
// ─────────────────────────────────────────────────────────
function toggleDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('open');
  drawer.classList.toggle('open', !isOpen);
  if (overlay) {
    overlay.style.opacity       = isOpen ? '0' : '1';
    overlay.style.pointerEvents = isOpen ? 'none' : 'auto';
  }
  btn?.classList.toggle('active', !isOpen);
}

// ─────────────────────────────────────────────────────────
//  Admin modal
// ─────────────────────────────────────────────────────────
function openAdminModal()  { const m = document.getElementById('admin-modal'); if(m){ m.style.display='flex'; requestAnimationFrame(() => m.classList.add('active')); } }
function closeAdminModal() { const m = document.getElementById('admin-modal'); if(m){ m.classList.remove('active'); setTimeout(() => { if(!m.classList.contains('active')) m.style.display='none'; }, 300); } }

async function handleLogin() {
  const pw  = document.getElementById('admin-password')?.value?.trim();
  const btn = document.getElementById('login-btn');
  if (!pw) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const r = await apiFetch('/api/auth/login', 'POST', { password: pw });
    if (r.success) {
      if (r.token) localStorage.setItem('admin_token', r.token);
      window.location.href = '/admin';
    } else {
      alert(r.message || 'Incorrect password');
    }
  } catch {
    alert('Login failed — check your connection.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
  }
}

document.getElementById('admin-password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

// ─────────────────────────────────────────────────────────
//  Hero text — applies the correct language from translations
//  Called by both fetchSettings() and toggleLanguage() so the
//  DB-sourced Arabic text and the static English text are always
//  in sync with the active language, regardless of load order.
// ─────────────────────────────────────────────────────────
function applyHeroText() {
  const lang = isArabic ? 'ar' : 'en';
  const t    = translations[lang];
  const l1   = document.getElementById('line1');
  const l2   = document.getElementById('line2');
  if (l1) l1.textContent = t.heroLine1;
  if (l2) l2.textContent = t.heroLine2;
}

// ─────────────────────────────────────────────────────────
//  Language toggle
// ─────────────────────────────────────────────────────────
function toggleLanguage() {
  isArabic = !isArabic;
  const lang = isArabic ? 'ar' : 'en';
  localStorage.setItem('sp_lang', lang);
  const t    = translations[lang];

  document.documentElement.lang = lang;
  document.documentElement.dir  = isArabic ? 'rtl' : 'ltr';

  const logoEl = document.getElementById('logo-name');
  const sEl    = document.getElementById('secret-s');
  if (isArabic) {
    if (sEl)    sEl.style.display = 'none';
    if (logoEl) logoEl.textContent = 'صهيب فوتو';
  } else {
    if (sEl)    sEl.style.display = '';
    if (logoEl) logoEl.textContent = 'uhaib Photo';
  }

  applyHeroText();

  const drawerTitle = document.querySelector('#drawer h3');
  if (drawerTitle) drawerTitle.textContent = t.drawerTitle;

  const portfolioBtn = document.querySelector('.btn-luxury');
  if (portfolioBtn) portfolioBtn.textContent = t.viewPortfolio;

  // Nav links: re-render from cached categories with new language
  renderNav(window._cachedCategories || []);

  const toggleEls = document.querySelectorAll('.lang-toggle');
  toggleEls.forEach((el, i) => {
    const isArabicEl = (i === 0 || i === 2);
    const active = isArabic ? isArabicEl : !isArabicEl;
    el.classList.toggle('text-white',    active);
    el.classList.toggle('text-gray-400', !active);
  });
}

// ─────────────────────────────────────────────────────────
//  Dynamic nav categories
// ─────────────────────────────────────────────────────────
async function fetchCategories() {
  try {
    const cats = await apiFetch('/api/categories');
    // Cache for language toggle re-renders
    window._cachedCategories = cats;
    renderNav(cats);
  } catch {
    // Silently fall back to empty nav (better than broken hardcoded labels)
  }
}

/**
 * Build <a> + <span class="nav-dot"> pairs inside #main-nav.
 * Each link carries the category slug (data-slug) and the localised name.
 * Clicking navigates to portfolio.html?cat=<slug>.
 */
function renderNav(cats) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const lang = isArabic ? 'ar' : 'en';
  const t    = translations[lang];
  // "All" tab is always first, using the translation key for correct language
  const allCats = [{ slug: 'all', nameAr: t.navAll, nameEn: 'All' }, ...cats.filter(c => c.slug !== 'all')];

  nav.innerHTML = allCats.map((cat, i) => {
    // Pick the localised name: nameAr / nameEn from DB, fallback to name
    const label = isArabic
      ? (cat.nameAr || cat.name || cat.nameEn || cat.slug)
      : (cat.nameEn || cat.name || cat.nameAr || cat.slug);
    const dot = i < allCats.length - 1 ? '<span class="nav-dot"></span>' : '';
    return `<a href="#" data-slug="${cat.slug}"
               class="hover:text-white transition-colors duration-300">${label}</a>${dot}`;
  }).join('');

  // Wire click → portfolio page with slug as query param
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const slug = link.dataset.slug;
      window.location.href = `portfolio.html?cat=${encodeURIComponent(slug)}`;
    });
  });
}

// ─────────────────────────────────────────────────────────
//  API helper
// ─────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = { method, credentials: 'include', headers: {} };
  const token = localStorage.getItem('admin_token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
