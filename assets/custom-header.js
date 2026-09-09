/**
 * custom-header.js
 *
 * Behaviour for sections/custom-header.liquid and
 * sections/custom-announcement-bar.liquid.
 *
 * Both sections request this file, so Shopify may emit the <script> tag twice.
 * Everything is wrapped in a guarded IIFE and every definition is checked
 * against the registry, so a second execution is a no-op.
 *
 * Progressive enhancement: all disclosures are native <details>/<summary> and
 * the search is a real <form>. Nothing here is required for the header to be
 * usable — this layer adds rotation, sticky behaviour, focus trapping and
 * scroll locking.
 */
(() => {
  'use strict';

  if (window.__customHeaderInit) return;
  window.__customHeaderInit = true;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  const define = (name, ctor) => {
    if (!customElements.get(name)) customElements.define(name, ctor);
  };

  /* ---------------------------------------------------------------------
   * <announcement-bar>
   * ------------------------------------------------------------------- */
  class AnnouncementBar extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.items = Array.from(this.querySelectorAll('.--announcement-item'));
      this.autoRotate = this.dataset.autoRotate === 'true';
      this.speed = parseInt(this.dataset.rotateSpeed, 10) || 5000;
      this.index = 0;
      this.timer = null;
      this.paused = false;

      if (this.dataset.dismissible === 'true' && this.isDismissed()) {
        this.hidden = true;
        return;
      }

      this.onPointerEnter = () => this.pause();
      this.onPointerLeave = () => this.resume();
      this.onVisibility = () => (document.hidden ? this.pause() : this.resume());

      this.querySelector('[data-announcement-prev]')?.addEventListener('click', () => {
        this.stop();
        this.goTo(this.index - 1);
      });
      this.querySelector('[data-announcement-next]')?.addEventListener('click', () => {
        this.stop();
        this.goTo(this.index + 1);
      });
      this.querySelector('[data-announcement-dismiss]')?.addEventListener('click', () => this.dismiss());

      this.toggleBtn = this.querySelector('[data-announcement-toggle]');
      this.toggleBtn?.addEventListener('click', () => this.toggleRotation());

      if (this.items.length > 1 && this.autoRotate && !prefersReducedMotion.matches) {
        this.addEventListener('mouseenter', this.onPointerEnter);
        this.addEventListener('mouseleave', this.onPointerLeave);
        this.addEventListener('focusin', this.onPointerEnter);
        this.addEventListener('focusout', this.onPointerLeave);
        document.addEventListener('visibilitychange', this.onVisibility);
        this.start();
      }
    }

    disconnectedCallback() {
      this.stop();
      document.removeEventListener('visibilitychange', this.onVisibility);
    }

    storageKey() {
      return `announcement-dismissed:${this.sectionId}`;
    }

    isDismissed() {
      try {
        return sessionStorage.getItem(this.storageKey()) === '1';
      } catch {
        return false;
      }
    }

    dismiss() {
      this.stop();
      this.hidden = true;
      try {
        sessionStorage.setItem(this.storageKey(), '1');
      } catch {
        /* private mode — dismiss for this page view only */
      }
    }

    goTo(next) {
      if (this.items.length < 2) return;
      const count = this.items.length;
      const target = ((next % count) + count) % count;

      this.items[this.index]?.classList.remove('is-active');
      this.items[this.index]?.setAttribute('aria-hidden', 'true');
      this.items[target].classList.add('is-active');
      this.items[target].removeAttribute('aria-hidden');
      this.index = target;
    }

    start() {
      this.stop();
      this.timer = setInterval(() => this.goTo(this.index + 1), this.speed);
      this.paused = false;
    }

    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }

    pause() {
      if (!this.autoRotate || this.userPaused) return;
      this.stop();
    }

    resume() {
      if (!this.autoRotate || this.userPaused || document.hidden) return;
      this.start();
    }

    toggleRotation() {
      this.userPaused = !this.userPaused;
      const pauseIcon = this.querySelector('[data-icon-pause]');
      const playIcon = this.querySelector('[data-icon-play]');

      if (this.userPaused) {
        this.stop();
        this.toggleBtn?.setAttribute('aria-pressed', 'true');
        this.toggleBtn?.setAttribute('aria-label', 'Play announcements');
      } else {
        this.start();
        this.toggleBtn?.setAttribute('aria-pressed', 'false');
        this.toggleBtn?.setAttribute('aria-label', 'Pause announcements');
      }

      if (pauseIcon) pauseIcon.hidden = this.userPaused;
      if (playIcon) playIcon.hidden = !this.userPaused;
    }
  }

  /* ---------------------------------------------------------------------
   * <sticky-header>
   * ------------------------------------------------------------------- */
  class StickyHeader extends HTMLElement {
    connectedCallback() {
      this.type = this.dataset.stickyType || 'none';
      this.header = this.querySelector('header');
      this.isTransparent = this.dataset.transparent === 'true';
      this.lastScroll = window.scrollY;
      this.ticking = false;

      this.measure();
      this.onResize = () => this.measure();
      window.addEventListener('resize', this.onResize, { passive: true });

      if (this.type === 'none' && !this.isTransparent) return;

      this.onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
          this.update();
          this.ticking = false;
        });
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.update();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
    }

    /** Publishes the header height so other sections can offset against it. */
    measure() {
      if (!this.header) return;
      this.height = this.header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${this.height}px`);
    }

    update() {
      const y = window.scrollY;
      const threshold = this.height || 0;

      if (this.isTransparent) {
        this.header?.classList.toggle('--is-transparent', y <= 10);
      }

      if (this.type === 'none') return;

      const stuck = y > threshold;
      this.classList.toggle('--is-sticky', stuck);
      // Reserve the space the fixed header vacates, so content does not jump.
      this.style.height = stuck ? `${this.height}px` : '';

      if (this.type === 'on-scroll-up') {
        const scrollingDown = y > this.lastScroll;
        this.classList.toggle('--is-hidden', stuck && scrollingDown && y > threshold * 2);
      }

      this.lastScroll = y;
    }
  }

  /* ---------------------------------------------------------------------
   * <header-nav> — one open submenu at a time, Escape and click-away close
   * ------------------------------------------------------------------- */
  class HeaderNav extends HTMLElement {
    connectedCallback() {
      this.details = Array.from(this.querySelectorAll('[data-nav-details]'));

      this.details.forEach((detail) => {
        detail.addEventListener('toggle', () => {
          if (!detail.open) return;
          this.details.forEach((other) => {
            if (other !== detail) other.open = false;
          });
        });
      });

      this.onKeydown = (event) => {
        if (event.key !== 'Escape') return;
        const open = this.details.find((d) => d.open);
        if (!open) return;
        open.open = false;
        open.querySelector('summary')?.focus();
      };

      this.onDocumentClick = (event) => {
        if (this.contains(event.target)) return;
        this.closeAll();
      };

      this.onFocusOut = (event) => {
        if (event.relatedTarget && this.contains(event.relatedTarget)) return;
        this.closeAll();
      };

      this.addEventListener('keydown', this.onKeydown);
      this.addEventListener('focusout', this.onFocusOut);
      document.addEventListener('click', this.onDocumentClick);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocumentClick);
    }

    closeAll() {
      this.details.forEach((d) => {
        d.open = false;
      });
    }
  }

  /* ---------------------------------------------------------------------
   * <header-drawer> — focus trap + scroll lock for the mobile menu
   * ------------------------------------------------------------------- */
  class HeaderDrawer extends HTMLElement {
    connectedCallback() {
      this.details = this.querySelector('[data-drawer-details]');
      this.summary = this.querySelector('summary');
      this.panel = this.querySelector('[data-drawer-panel]');
      if (!this.details || !this.panel) return;

      this.details.addEventListener('toggle', () => {
        this.details.open ? this.onOpen() : this.onClose();
      });

      this.querySelector('[data-drawer-overlay]')?.addEventListener('click', () => this.close());
      this.querySelector('[data-drawer-close]')?.addEventListener('click', () => this.close());

      this.onKeydown = (event) => {
        if (!this.details.open) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
        if (event.key === 'Tab') this.trapFocus(event);
      };

      this.onResize = () => {
        if (window.innerWidth > 1023 && this.details.open) this.close();
      };

      document.addEventListener('keydown', this.onKeydown);
      window.addEventListener('resize', this.onResize, { passive: true });
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this.onKeydown);
      window.removeEventListener('resize', this.onResize);
      this.unlockScroll();
    }

    onOpen() {
      this.lockScroll();
      const first = this.panel.querySelector(FOCUSABLE);
      // Defer so the panel is painted before focus moves into it.
      requestAnimationFrame(() => first?.focus());
    }

    onClose() {
      this.unlockScroll();
      this.summary?.focus();
    }

    close() {
      if (this.details.open) this.details.open = false;
    }

    lockScroll() {
      this.scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
    }

    unlockScroll() {
      document.body.style.overflow = '';
    }

    trapFocus(event) {
      const focusable = Array.from(this.panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /* ---------------------------------------------------------------------
   * Cart count
   * Refreshes [data-cart-count] from /cart.js. Fires on the `cart:refresh`
   * event, on Dawn's `cart:update`, and on bfcache restore.
   * ------------------------------------------------------------------- */
  const refreshCartCount = async () => {
    const targets = document.querySelectorAll('[data-cart-count]');
    if (!targets.length) return;
    try {
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`);
      if (!response.ok) return;
      const cart = await response.json();
      targets.forEach((el) => {
        el.textContent = cart.item_count;
        el.classList.toggle('is-empty', cart.item_count === 0);
      });
    } catch {
      /* offline or blocked — leave the server-rendered count in place */
    }
  };

  document.addEventListener('cart:refresh', refreshCartCount);
  document.addEventListener('cart:update', refreshCartCount);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) refreshCartCount();
  });

  /* ---------------------------------------------------------------------
   * Theme editor: preview the block a merchant selects.
   * ------------------------------------------------------------------- */
  document.addEventListener('shopify:block:select', (event) => {
    const item = event.target.closest('.--announcement-item');
    const bar = event.target.closest('announcement-bar');
    if (!item || !bar) return;
    bar.stop?.();
    const index = Array.from(bar.querySelectorAll('.--announcement-item')).indexOf(item);
    if (index > -1) bar.goTo?.(index);
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    event.target.closest('announcement-bar')?.resume?.();
  });

  define('announcement-bar', AnnouncementBar);
  define('sticky-header', StickyHeader);
  define('header-nav', HeaderNav);
  define('header-drawer', HeaderDrawer);
})();
