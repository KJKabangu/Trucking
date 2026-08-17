/**
 * GFK Transport LLC
 *
 * Progressive enhancement only. Every page works with JavaScript disabled:
 * the nav is a plain list, the FAQ uses native <details>, and the forms are
 * ordinary POSTs. Nothing here is load-bearing.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
      // Stop the page behind the menu from scrolling on touch devices.
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Escape closes and returns focus to the button, which is what a keyboard
    // user expects from anything modal-ish.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Tapping a link inside the open menu should close it.
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    // Reset state if the viewport grows past the mobile breakpoint while open.
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = (e) => {
      if (e.matches) setOpen(false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
  }

  /* ------------------------------------------------------------------
     Quote form: preselect the service when arriving from a service link
     (/quote/?service=box-truck)
     ------------------------------------------------------------------ */

  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('service');

  if (wanted) {
    const select = document.querySelector('select[name="service"]');
    if (select) {
      const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
      const target = normalize(wanted);
      for (const option of select.options) {
        if (normalize(option.value).startsWith(target.slice(0, 6))) {
          select.value = option.value;
          break;
        }
      }
    }
  }

  /* ------------------------------------------------------------------
     Forms: block double submission and give honest feedback while the
     request is in flight. A shipper who taps "Send" twice should not
     generate two quote requests.
     ------------------------------------------------------------------ */

  document.querySelectorAll('form[data-guard]').forEach((form) => {
    form.addEventListener('submit', () => {
      // Let native validation reject first.
      if (!form.checkValidity()) return;

      const button = form.querySelector('button[type="submit"]');
      if (!button) return;

      button.dataset.label = button.textContent;
      button.textContent = 'Sending...';
      button.disabled = true;

      // If the navigation is cancelled or the network stalls, restore the
      // button rather than leaving the person stuck with a dead form.
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.disabled = false;
        button.textContent = button.dataset.label || 'Submit';
      }, 12000);
    });
  });

  /* ------------------------------------------------------------------
     Pickup date fields cannot be in the past
     ------------------------------------------------------------------ */

  const today = new Date();
  const iso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  document.querySelectorAll('input[type="date"][data-no-past]').forEach((input) => {
    input.min = iso;
  });

  /* ------------------------------------------------------------------
     Shrink the sticky header once the page has scrolled, so the hero gets
     the full viewport on a phone.
     ------------------------------------------------------------------ */

  const header = document.getElementById('site-header');
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }
})();
