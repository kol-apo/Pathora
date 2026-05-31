/* ================================================
   PATHORA — Shared Utilities
   ================================================ */

// ── Navbar scroll effect ──
const navbar = document.querySelector('.navbar');
if (navbar) {
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Mobile menu ──
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
const mobClose = document.querySelector('.mob-close');

function openMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.add('open');
  document.body.style.overflow = 'hidden';
  hamburger && hamburger.setAttribute('aria-expanded', 'true');
  mobClose && mobClose.focus();
}

function closeMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
  hamburger && hamburger.setAttribute('aria-expanded', 'false');
  hamburger && hamburger.focus();
}

hamburger && hamburger.addEventListener('click', openMenu);
mobClose && mobClose.addEventListener('click', closeMenu);

// Close on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) closeMenu();
});

// ── Toast ──
function showToast(message, type = 'success') {
  const wrap = document.querySelector('.toast-wrap') || (() => {
    const el = document.createElement('div');
    el.className = 'toast-wrap';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  })();

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A020" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span><div class="toast-bar"></div>`;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Expose globally ──
window.showToast = showToast;

// ── Time-based greeting ──
function getGreeting(name) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}
window.getGreeting = getGreeting;

// ── Format date ──
function formatDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
window.formatDate = formatDate;
