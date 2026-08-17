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

  /**
   * A short reference both sides can quote on the phone. Deliberately not a
   * booking number: nothing is booked until an owner confirms it. It exists so
   * "I sent a request this morning" becomes "GFK-260817-4KP2".
   */
  function makeReference() {
    const d = new Date();
    const stamp =
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    // Omits I, O, 0 and 1, which get misheard and mistyped over a phone.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tail = '';
    const random = new Uint32Array(4);
    (window.crypto || window.msCrypto).getRandomValues(random);
    for (let i = 0; i < 4; i++) tail += alphabet[random[i] % alphabet.length];
    return 'GFK-' + stamp + '-' + tail;
  }

  document.querySelectorAll('form[data-guard]').forEach((form) => {
    form.addEventListener('submit', () => {
      // Let native validation reject first.
      if (!form.checkValidity()) return;

      // Attach a reference and stash it so the thank-you page can show it.
      const field = form.querySelector('input[name="reference"]');
      if (field) {
        const ref = makeReference();
        field.value = ref;
        try {
          window.sessionStorage.setItem('gfk-reference', ref);
        } catch (err) {
          // Private browsing can refuse sessionStorage. The reference still
          // goes out with the form, it just will not be echoed back on screen.
        }
      }

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
     Thank-you page: echo the reference and tailor the copy to whichever
     form was actually submitted.
     ------------------------------------------------------------------ */

  const refSlot = document.getElementById('reference-slot');
  if (refSlot) {
    let ref = null;
    try {
      ref = window.sessionStorage.getItem('gfk-reference');
      window.sessionStorage.removeItem('gfk-reference');
    } catch (err) {
      /* storage unavailable, fall through to hiding the block */
    }
    if (ref) {
      const code = refSlot.querySelector('[data-reference]');
      if (code) code.textContent = ref;
      refSlot.hidden = false;
    }
  }

  const typePanels = document.querySelectorAll('[data-thanks-type]');
  if (typePanels.length) {
    const type = params.get('type') || 'contact';
    let matched = false;
    typePanels.forEach((panel) => {
      const isMatch = panel.dataset.thanksType === type;
      panel.hidden = !isMatch;
      if (isMatch) matched = true;
    });
    // Unknown or missing type falls back to the general panel.
    if (!matched) {
      const fallback = document.querySelector('[data-thanks-type="contact"]');
      if (fallback) fallback.hidden = false;
    }
  }

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
