/**
 * وادي السلاطين - نظام سلة الاستفسار
 * Wadi Al-Salateen Inquiry Cart System
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ws_inquiry_cart';
  const WA_PHONE = '9647829090060';

  // --- Cart State Management ---
  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter(item => typeof item === 'string' && item.trim().length > 0))];
      }
    } catch (e) {
      console.error('Error reading cart:', e);
    }
    return [];
  }

  function saveCart(items) {
    try {
      const unique = [...new Set(items.filter(item => typeof item === 'string' && item.trim().length > 0))];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
      window.dispatchEvent(new CustomEvent('ws-cart-updated', { detail: { items: unique } }));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  function addToCart(productName) {
    const trimmed = productName.trim();
    if (!trimmed) return false;
    const current = getCart();
    if (!current.includes(trimmed)) {
      current.push(trimmed);
      saveCart(current);
      return true;
    }
    return false;
  }

  function removeFromCart(productName) {
    const trimmed = productName.trim();
    const current = getCart().filter(item => item !== trimmed);
    saveCart(current);
  }

  function clearCart() {
    saveCart([]);
  }

  function isInCart(productName) {
    return getCart().includes(productName.trim());
  }

  // --- Toast Notification ---
  let toastTimeout = null;
  function showToast(message) {
    let toast = document.getElementById('ws-cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ws-cart-toast';
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // --- Cart Drawer Markup Injection ---
  function ensureDrawerMarkup() {
    if (document.getElementById('ws-cart-drawer')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'ws-cart-backdrop';
    backdrop.className = 'cart-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.id = 'ws-cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-label', 'سلة الاستفسار');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');

    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <div class="cart-drawer-title-group">
          <h3>
            سلة الاستفسار
            <span class="badge" id="ws-cart-header-count">0</span>
          </h3>
          <p>المنتجات المحددة للاستفسار والطلب</p>
        </div>
        <button type="button" class="cart-close-btn" id="ws-cart-close" aria-label="إغلاق السلة">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="cart-drawer-body" id="ws-cart-body">
        <!-- Rendered items or empty state dynamically -->
      </div>

      <div class="cart-drawer-footer">
        <div class="cart-footer-meta">
          <span id="ws-cart-footer-summary">عدد المنتجات: 0</span>
          <button type="button" class="cart-clear-btn" id="ws-cart-clear-btn">تفريغ السلة</button>
        </div>
        <button type="button" class="cart-wa-submit-btn" id="ws-cart-submit-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 11.5A8.500 8.500 0 0 1 7.500 19L3 20.500 4.500 16A8.500 8.500 0 1 1 20 11.500Z"/>
            <path d="M9 9.500c.5 2 2.500 4 5 5l1.500-1.500-2-1-1 .700c-.800-.400-1.400-1-1.800-1.800l.700-1-1-2L9 9.500Z"/>
          </svg>
          <span>إرسال الاستفسار عبر واتساب</span>
        </button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Bind Drawer Close & Action Events
    backdrop.addEventListener('click', closeCart);
    document.getElementById('ws-cart-close').addEventListener('click', closeCart);

    document.getElementById('ws-cart-clear-btn').addEventListener('click', () => {
      const items = getCart();
      if (items.length === 0) return;
      clearCart();
      showToast('تم تفريغ السلة');
    });

    document.getElementById('ws-cart-submit-btn').addEventListener('click', sendInquiryWhatsApp);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isCartOpen()) {
        closeCart();
      }
    });
  }

  // --- Floating Button Injection (Desktop only access) ---
  function ensureFloatingButton() {
    if (document.getElementById('ws-floating-cart-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ws-floating-cart-btn';
    btn.type = 'button';
    btn.className = 'floating-cart-btn';
    btn.setAttribute('aria-label', 'عرض سلة الاستفسار');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span>سلة</span>
      <span class="floating-badge" id="ws-floating-cart-count">0</span>
    `;

    btn.addEventListener('click', openCart);
    document.body.appendChild(btn);
  }

  // --- Mobile Drawer Menu Integration ---
  function setMobileDrawerState(open) {
    const burger = document.getElementById('burger');
    const drawer = document.getElementById('drawer');
    if (burger) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    }
    if (drawer) {
      drawer.classList.toggle('open', open);
    }
  }

  function setupMobileDrawer() {
    const burger = document.getElementById('burger');
    const drawer = document.getElementById('drawer');
    if (!burger || !drawer) return;

    if (burger.dataset.drawerBound === 'true') return;
    burger.dataset.drawerBound = 'true';

    burger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = drawer.classList.contains('open');
      setMobileDrawerState(!isOpen);
    });

    drawer.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (link) {
        setMobileDrawerState(false);
      }
    });

    document.addEventListener('click', function (e) {
      if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target)) {
        setMobileDrawerState(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        setMobileDrawerState(false);
      }
    });
  }

  function ensureCategoryNavigation() {
    const isCategoryPage = !window.location.pathname.endsWith('index.html') &&
                           window.location.pathname !== '/' &&
                           window.location.pathname !== '';
    if (!isCategoryPage) return;

    const nav = document.querySelector('nav');
    if (!nav) return;

    let burger = document.getElementById('burger');
    if (!burger) {
      burger = document.createElement('button');
      burger.className = 'burger';
      burger.id = 'burger';
      burger.setAttribute('aria-label', 'فتح القائمة');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-controls', 'drawer');
      burger.innerHTML = '<span></span><span></span><span></span>';
      nav.appendChild(burger);
    }

    let drawer = document.getElementById('drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'drawer';
      drawer.id = 'drawer';
      drawer.innerHTML = `
        <a href="index.html">الرئيسية</a>
        <a href="index.html#cta">تواصل معنا</a>
        <button type="button" class="drawer-cart-btn" id="ws-drawer-cart-btn">
          <span>سلة</span>
          <span class="badge" id="ws-drawer-cart-count">0</span>
        </button>
      `;
      nav.parentNode.insertBefore(drawer, nav.nextSibling);
    }
  }

  function ensureDrawerMenuItem() {
    const drawer = document.getElementById('drawer');
    if (!drawer) return;

    let cartBtn = document.getElementById('ws-drawer-cart-btn');
    if (!cartBtn) {
      cartBtn = document.createElement('button');
      cartBtn.type = 'button';
      cartBtn.id = 'ws-drawer-cart-btn';
      cartBtn.className = 'drawer-cart-btn';
      cartBtn.setAttribute('aria-label', 'عرض سلة الاستفسار');
      cartBtn.innerHTML = `
        <span>سلة</span>
        <span class="badge" id="ws-drawer-cart-count">0</span>
      `;
      const ctaLink = drawer.querySelector('.drawer-cta');
      if (ctaLink) {
        drawer.insertBefore(cartBtn, ctaLink);
      } else {
        drawer.appendChild(cartBtn);
      }
    }

    if (!cartBtn.dataset.cartBound) {
      cartBtn.dataset.cartBound = 'true';
      cartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setMobileDrawerState(false);
        openCart();
      });
    }
  }

  // --- Drawer Open / Close ---
  function isCartOpen() {
    const drawer = document.getElementById('ws-cart-drawer');
    return drawer && drawer.classList.contains('open');
  }

  function openCart() {
    ensureDrawerMarkup();
    renderCartDrawer();
    document.getElementById('ws-cart-backdrop')?.classList.add('open');
    document.getElementById('ws-cart-drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('ws-cart-backdrop')?.classList.remove('open');
    document.getElementById('ws-cart-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --- Render Cart Drawer Content ---
  function renderCartDrawer() {
    const body = document.getElementById('ws-cart-body');
    const headerCount = document.getElementById('ws-cart-header-count');
    const footerSummary = document.getElementById('ws-cart-footer-summary');
    const submitBtn = document.getElementById('ws-cart-submit-btn');
    const clearBtn = document.getElementById('ws-cart-clear-btn');
    if (!body) return;

    const items = getCart();
    const count = items.length;

    if (headerCount) headerCount.textContent = count;
    if (footerSummary) footerSummary.textContent = `عدد المنتجات: ${count}`;

    if (submitBtn) {
      submitBtn.disabled = count === 0;
    }
    if (clearBtn) {
      clearBtn.style.visibility = count === 0 ? 'hidden' : 'visible';
    }

    if (count === 0) {
      body.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h4>السلة فارغة حالياً</h4>
          <p>تصفّح المنتجات واضغط على «أضف إلى السلة» لتحديد ما تحتاجه بسهولة.</p>
        </div>
      `;
      return;
    }

    let html = '<ul class="cart-items-list">';
    items.forEach((item, index) => {
      const num = String(index + 1).padStart(2, '0');
      // Escaping for HTML attribute and content
      const safeName = item.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += `
        <li class="cart-item-row">
          <div class="cart-item-info">
            <span class="cart-item-num">${num}</span>
            <span class="cart-item-title">${safeName}</span>
          </div>
          <button type="button" class="cart-item-remove-btn" data-remove="${safeName}" aria-label="إزالة ${safeName}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </li>
      `;
    });
    html += '</ul>';

    body.innerHTML = html;

    // Attach individual remove handlers
    body.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemToRemove = btn.getAttribute('data-remove');
        if (itemToRemove) {
          removeFromCart(itemToRemove);
        }
      });
    });
  }

  // --- Sync Badges & Product Buttons ---
  function updateUI() {
    const items = getCart();
    const count = items.length;

    // Update Navbar Badge
    const navBadge = document.getElementById('ws-nav-cart-count');
    if (navBadge) {
      navBadge.textContent = count;
      navBadge.classList.add('pop');
      setTimeout(() => navBadge.classList.remove('pop'), 200);
    }

    // Update Floating Button Badge (Visible on desktop at all times)
    const floatBadge = document.getElementById('ws-floating-cart-count');
    if (floatBadge) {
      floatBadge.textContent = count;
    }

    // Update Drawer Menu Link / Button
    const drawerBadges = document.querySelectorAll('#ws-drawer-cart-count');
    drawerBadges.forEach(b => {
      b.textContent = count;
    });

    // Sync all product buttons in the page
    document.querySelectorAll('.items li').forEach(li => {
      const nameEl = li.querySelector('.i-name');
      const btn = li.querySelector('.i-go');
      if (!nameEl || !btn) return;

      const productName = nameEl.textContent.trim();
      const inCart = items.includes(productName);

      if (inCart) {
        btn.classList.add('is-added');
        btn.textContent = 'تمت الإضافة ✓';
        btn.setAttribute('aria-label', `${productName} مضاف إلى السلة`);
      } else {
        btn.classList.remove('is-added');
        btn.textContent = 'أضف إلى السلة';
        btn.setAttribute('aria-label', `أضف ${productName} إلى السلة`);
      }
    });

    if (isCartOpen()) {
      renderCartDrawer();
    }
  }

  // --- Send WhatsApp Inquiry ---
  function sendInquiryWhatsApp() {
    const items = getCart();
    if (items.length === 0) return;

    let message = 'السلام عليكم،\nحابب أستفسر عن توفر وأسعار هذه المنتجات:\n\n';
    items.forEach((item, index) => {
      message += `${index + 1}- ${item}\n`;
    });
    message += '\nيا ريت تفيدوني بالتفاصيل وطريقة التوصيل، شكراً لكم.';

    const waUrl = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`;

    // Safe DOM link click activation (preserves user state without dropping cart)
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('جاري فتح واتساب...');
  }

  // --- Attach Handlers to Product Lists on Detailed Pages ---
  function setupProductButtons() {
    const itemsList = document.querySelectorAll('.items li');
    if (!itemsList.length) return;

    itemsList.forEach(li => {
      const nameEl = li.querySelector('.i-name');
      let btn = li.querySelector('.i-go');
      if (!nameEl) return;

      const productName = nameEl.textContent.trim();

      // If button was an <a> tag, replace with <button>
      if (btn && btn.tagName.toLowerCase() === 'a') {
        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = btn.className;
        newBtn.textContent = 'أضف إلى السلة';
        btn.parentNode.replaceChild(newBtn, btn);
        btn = newBtn;
      }

      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (isInCart(productName)) {
            // If already in cart, toggle remove or open cart
            removeFromCart(productName);
            showToast(`تمت إزالة "${productName}" من السلة`);
          } else {
            addToCart(productName);
            showToast(`تمت إضافة "${productName}" إلى السلة`);
          }
        });
      }
    });
  }

  // --- Initialize ---
  function init() {
    ensureDrawerMarkup();
    ensureCategoryNavigation();
    ensureDrawerMenuItem();
    setupMobileDrawer();
    ensureFloatingButton();
    setupProductButtons();
    updateUI();

    window.addEventListener('ws-cart-updated', updateUI);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        updateUI();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
