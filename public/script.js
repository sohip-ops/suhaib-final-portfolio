/**
 * script.js — Suhaib Photo · Homepage
 */
'use strict';

const API_BASE = '';

// ──────────────────────────────────────────────────────────────
//  Language data
// ──────────────────────────────────────────────────────────────
let isArabic = true;

const translations = {
  ar: {
    siteName:      'صهيب فوتو',
    heroLine1:     '..جودة بصرية تليق بك',
    heroLine2:     'حكايات ترويها العدسة',
    drawerTitle:   'تواصل معنا',
    viewPortfolio: 'عرض المعرض',
    navAll:        'الكل',
    navPeople:     'أشخاص',
    navViews:      'مناظر طبيعية',
    navEvents:     'فعاليات',
    navProducts:   'منتجات',
    navCars:       'سيارات',
  },
  en: {
    siteName:      'Suhaib Photo',
    heroLine1:     'Visual quality you deserve..',
    heroLine2:     'Stories told through the lens',
    drawerTitle:   'Contact Us',
    viewPortfolio: 'View Portfolio',
    navAll:        'All',
    navPeople:     'People',
    navViews:      'Beautiful views',
    navEvents:     'Events',
    navProducts:   'Products',
    navCars:       'Cars',
  }
};

// ──────────────────────────────────────────────────────────────
//  Init on load
// ──────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  hideSkeleton();
  fetchSettings();
  fetchPanels();

  // View Portfolio button
  document.querySelector('.btn-luxury')
    ?.addEventListener('click', () => { window.location.href = 'portfolio.html'; });

  // Desktop nav links
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const raw = link.textContent.trim().toLowerCase().replace(/\s+/g, '-');
      window.location.href = `portfolio.html?cat=${encodeURIComponent(raw)}`;
    });
  });

  // Hamburger
  document.getElementById('hamburger-btn')
    ?.addEventListener('click', toggleDrawer);
});

// ──────────────────────────────────────────────────────────────
//  Skeleton loader
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
//  Settings (social links + hero text)
// ──────────────────────────────────────────────────────────────
async function fetchSettings() {
  try {
    const data = await apiFetch('/api/settings');
    const wa = document.getElementById('whatsapp-link');
    const ig = document.getElementById('instagram-link');
    if (wa && data.whatsapp)  wa.href = data.whatsapp;
    if (ig && data.instagram) ig.href = data.instagram;
    // Save Arabic hero text from server into translations
    if (data.hero_text_ar) translations.ar.heroLine1 = data.hero_text_ar;
    if (data.hero_sub_ar)  translations.ar.heroLine2 = data.hero_sub_ar;
    // Apply to page if still in Arabic
    if (isArabic) {
      const l1 = document.getElementById('line1');
      const l2 = document.getElementById('line2');
      if (l1 && data.hero_text_ar) l1.textContent = data.hero_text_ar;
      if (l2 && data.hero_sub_ar)  l2.textContent = data.hero_sub_ar;
    }
  } catch {
    const wa = document.getElementById('whatsapp-link');
    const ig = document.getElementById('instagram-link');
    if (wa) wa.href = 'https://wa.me/966500000000';
    if (ig) ig.href = 'https://instagram.com/suhaibphoto';
  }
}

// ──────────────────────────────────────────────────────────────
//  Homepage background panels
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
//  Flash effect — فوق الكاميرا فقط + اهتزاز
// ──────────────────────────────────────────────────────────────
function triggerFlash() {
  const camera = document.getElementById('camera-container');
  if (!camera) return;

  // وميض أبيض يظهر فوق الكاميرا فقط
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

  // اهتزاز الكاميرا
  camera.classList.remove('flash-click');
  void camera.offsetWidth;
  camera.classList.add('flash-click');
  camera.addEventListener('animationend', () => {
    camera.classList.remove('flash-click');
  }, { once: true });
}

// ──────────────────────────────────────────────────────────────
//  Drawer
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
//  Admin modal
// ──────────────────────────────────────────────────────────────
function openAdminModal()  { document.getElementById('admin-modal')?.classList.add('active'); }
function closeAdminModal() { document.getElementById('admin-modal')?.classList.remove('active'); }

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
    window.location.href = 'admin.html';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
  }
}

document.getElementById('admin-password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

// ──────────────────────────────────────────────────────────────
//  Language toggle
// ──────────────────────────────────────────────────────────────
function toggleLanguage() {
  isArabic = !isArabic;
  const lang = isArabic ? 'ar' : 'en';
  const t    = translations[lang];

  document.documentElement.lang = lang;
  document.documentElement.dir  = isArabic ? 'rtl' : 'ltr';

  // اسم الموقع
  const logoEl = document.getElementById('logo-name');
  const sEl    = document.getElementById('secret-s');
  if (isArabic) {
    // عربي: نخفي الـ S ونكتب الاسم الكامل
    if (sEl)    { sEl.style.display = 'none'; }
    if (logoEl) { logoEl.textContent = 'صهيب فوتو'; }
  } else {
    // إنجليزي: نُعيد S ونكتب الجزء الباقي
    if (sEl)    { sEl.style.display = ''; }
    if (logoEl) { logoEl.textContent = 'uhaib Photo'; }
  }

  // النص الرئيسي
  const l1 = document.getElementById('line1');
  const l2 = document.getElementById('line2');
  if (l1) l1.textContent = t.heroLine1;
  if (l2) l2.textContent = t.heroLine2;

  // عنوان القائمة الجانبية
  const drawerTitle = document.querySelector('#drawer h3');
  if (drawerTitle) drawerTitle.textContent = t.drawerTitle;

  // زر المعرض
  const portfolioBtn = document.querySelector('.btn-luxury');
  if (portfolioBtn) {
    portfolioBtn.textContent = t.viewPortfolio;
    // Ensure onclick is always set
    if (!portfolioBtn.hasAttribute('onclick')) {
      portfolioBtn.onclick = () => { window.location.href = 'portfolio.html'; };
    }
  }

  // روابط التنقل العلوية
  const navLinks = document.querySelectorAll('nav a');
  const navKeys  = ['navAll','navPeople','navViews','navEvents','navProducts','navCars'];
  navLinks.forEach((link, i) => {
    if (navKeys[i]) link.textContent = t[navKeys[i]];
  });

  // تمييز اللغة النشطة: [0]=العربية header, [1]=English header, [2]=العربية bottom, [3]=English bottom
  const toggleEls = document.querySelectorAll('.lang-toggle');
  toggleEls.forEach((el, i) => {
    const isArabicEl = (i === 0 || i === 2); // العربية في 0 و 2
    const active = isArabic ? isArabicEl : !isArabicEl;
    el.classList.toggle('text-white',   active);
    el.classList.toggle('text-gray-400', !active);
  });
}

// ──────────────────────────────────────────────────────────────
//  API helper
// ──────────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = { method, credentials: 'include', headers: {} };
  const token = localStorage.getItem('admin_token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
