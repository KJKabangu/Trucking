#!/usr/bin/env node
/**
 * Zero-dependency static site generator for GFK Transport LLC.
 *
 *   node build.mjs            build once into dist/
 *   node build.mjs --check    build, then exit 1 if any TODO placeholder remains
 *   node build.mjs --serve    build, then serve dist/ on http://localhost:3000
 *   node build.mjs --watch    rebuild on change (combine with --serve)
 *
 * Why a build step at all, for a site this small: the nav, the footer, and the
 * name/address/phone block appear on every page. Local search ranking punishes
 * inconsistent contact details, and hand-maintaining them across a dozen files
 * guarantees they drift. One config, one render, no drift.
 */

import { readFile, writeFile, mkdir, readdir, rm, stat, cp } from 'node:fs/promises';
import { existsSync, statSync, watch } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const PAGES = path.join(SRC, 'pages');
const PARTIALS = path.join(SRC, 'partials');
const ASSETS = path.join(SRC, 'assets');
const STATIC = path.join(ROOT, 'static');
const DIST = path.join(ROOT, 'dist');

const args = new Set(process.argv.slice(2));
const FLAGS = {
  check: args.has('--check'),
  serve: args.has('--serve'),
  watch: args.has('--watch'),
};

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const attr = esc;

/** JSON embedded in a <script> tag has to not contain a literal </script>. */
const jsonScript = (obj) =>
  JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

const get = (obj, dotted) =>
  dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

/**
 * Unwrap TODO() markers, recording where each one was so the build can report
 * exactly what still needs a real value.
 */
function resolveTodos(node, trail = [], found = []) {
  if (node === null || typeof node !== 'object') return { value: node, found };
  if (node.__todo === true) {
    found.push(trail.join('.'));
    return { value: resolveTodos(node.value, trail, found).value, found };
  }
  if (Array.isArray(node)) {
    return { value: node.map((v, i) => resolveTodos(v, [...trail, i], found).value), found };
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = resolveTodos(v, [...trail, k], found).value;
  }
  return { value: out, found };
}

const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');

function telHref(phone) {
  const d = digitsOnly(phone);
  if (!d) return '';
  return d.length === 10 ? `tel:+1${d}` : `tel:+${d}`;
}

/**
 * Resolve an optional site-root image path such as "/assets/img/owners.jpg" to
 * a URL that actually exists on disk, trying the common extensions so that a
 * photo saved as .png or .jpeg still gets picked up. Returns null when nothing
 * matches, which callers treat as "render the fallback".
 */
function resolveOptionalImage(src) {
  if (!src) return null;
  const rel = src.replace(/^\/assets\//, '');
  const ext = path.extname(rel);
  const base = ext ? rel.slice(0, -ext.length) : rel;
  const candidates = [rel, ...['.jpg', '.jpeg', '.png', '.webp', '.avif'].map((e) => base + e)];

  for (const candidate of candidates) {
    const abs = path.join(ASSETS, candidate.split('/').join(path.sep));
    // An empty file counts as absent. Editors and file managers routinely leave
    // a 0-byte stub behind when a save is cancelled or a drag-and-drop misses,
    // and rendering that as an <img> gives a broken-image icon on the About
    // page, which is worse than the initials fallback.
    if (existsSync(abs) && statSync(abs).size > 1024) {
      return `/assets/${candidate}`;
    }
  }
  return null;
}

function formatTime(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}:00 ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ---------------------------------------------------------------------------
// Inline SVG icon set. Inline rather than a sprite file or an icon font so the
// icons cannot cause a second request, a flash of missing content, or a CSP
// problem. Stroke-based, inherits currentColor.
// ---------------------------------------------------------------------------

const ICONS = {
  van: '<path d="M2 7h11v9H2z"/><path d="M13 10h4.5l3.5 3.5V16H13z"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
  boxtruck:
    '<path d="M4 6h10v11H4z"/><path d="M14 9h3.5l3 3.5V17H14z"/><circle cx="7.5" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/><path d="M4 17H1.5v-4"/>',
  reefer:
    '<path d="M2 7h12v9H2z"/><path d="M14 10h4l3 3.5V16h-7z"/><circle cx="6" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/><path d="M8 9.5v5M5.8 11l4.4 2M5.8 13l4.4-2"/>',
  flatbed:
    '<path d="M2 14h12V9M14 14h7v-2l-3.5-3H14"/><path d="M2 14h19"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M4 9h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  route:
    '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M15.5 6H10a4 4 0 0 0 0 8h4a4 4 0 0 1 0 8H8.5"/>',
  stack: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="m2.5 12.5 9.5 5 9.5-5"/><path d="m2.5 17 9.5 5 9.5-5"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3 8.3-7.5 9.5-4.5-1.2-7.5-5-7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  phone:
    '<path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3z"/>',
  mail: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  wrench:
    '<path d="M15.5 3.5a5.5 5.5 0 0 0-6.9 6.9L3 16v5h5l5.6-5.6a5.5 5.5 0 0 0 6.9-6.9L17 12l-3.5-.5L13 8z"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4A6.5 6.5 0 0 1 21.5 20"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};

const icon = (name, cls = '') => {
  const body = ICONS[name] || ICONS.check;
  return (
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ` +
    `focusable="false">${body}</svg>`
  );
};

// ---------------------------------------------------------------------------
// Template engine: {{ escaped }}, {{{ raw }}}, {{> partial }}
// ---------------------------------------------------------------------------

async function loadPartials() {
  const out = {};
  if (!existsSync(PARTIALS)) return out;
  for (const file of await readdir(PARTIALS)) {
    if (!file.endsWith('.html')) continue;
    out[path.basename(file, '.html')] = await readFile(path.join(PARTIALS, file), 'utf8');
  }
  return out;
}

function render(template, ctx, partials, depth = 0) {
  if (depth > 10) throw new Error('Partial recursion limit exceeded');

  let out = template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return render(partials[name], ctx, partials, depth + 1);
  });

  out = out.replace(/\{\{\{\s*([\w.$]+)\s*\}\}\}/g, (_, key) => {
    const v = get(ctx, key);
    return v == null ? '' : String(v);
  });

  out = out.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (_, key) => {
    const v = get(ctx, key);
    return v == null ? '' : esc(v);
  });

  return out;
}

/**
 * Pages open with an HTML comment holding their metadata:
 *   <!--meta { "title": "...", "description": "...", "path": "/services/" } -->
 */
function parsePage(raw, filename) {
  const match = raw.match(/^\s*<!--meta([\s\S]*?)-->/);
  if (!match) throw new Error(`${filename} is missing its <!--meta ... --> block`);
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`${filename} has invalid JSON in its meta block: ${err.message}`);
  }
  return { meta, body: raw.slice(match[0].length).trim() };
}

// ---------------------------------------------------------------------------
// HTML block builders
// ---------------------------------------------------------------------------

function buildBlocks(cfg, computed, currentPath) {
  const c = cfg;
  const B = {};

  // Unfilled config renders as nothing rather than as visible placeholder text.
  // A visitor should never see "Describe pay:" on a live site, and a section
  // that quietly omits itself is better than one advertising the gap.
  const filled = (key) => !computed.todos.has(key);

  const isActive = (href) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  B.navLinks = c.nav
    .map(
      (item) =>
        `<li><a href="${attr(item.href)}"${isActive(item.href) ? ' aria-current="page"' : ''}>${esc(
          item.label
        )}</a></li>`
    )
    .join('\n');

  B.footerServiceLinks = c.services
    .map((s) => `<li><a href="/services/#${attr(s.slug)}">${esc(s.name)}</a></li>`)
    .join('\n');

  // Home page service grid. The column count follows the number of services so
  // that adding or removing one never leaves a single orphaned card on the last
  // row: four services render as 2x2, six as 2x3.
  const serviceCols = c.services.length % 3 === 0 ? 3 : c.services.length % 2 === 0 ? 2 : 3;
  B.serviceCards = `<div class="grid grid--${serviceCols}">${c.services
    .map(
      (s) => `
<a class="card card--service" href="/services/#${attr(s.slug)}">
  <span class="card__icon">${icon(s.icon)}</span>
  <h3 class="card__title">${esc(s.name)}</h3>
  <p class="card__body">${esc(s.short)}</p>
  <span class="card__more">Details <span aria-hidden="true">&rarr;</span></span>
</a>`
    )
    .join('\n')}</div>`;

  // Written out so the copy never claims a service count that does not match
  // the configured list.
  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  B.serviceCount = NUMBER_WORDS[c.services.length] || String(c.services.length);

  // Services page detail sections
  B.serviceSections = c.services
    .map(
      (s, i) => `
<section class="service" id="${attr(s.slug)}">
  <div class="service__head">
    <span class="service__icon">${icon(s.icon)}</span>
    <div>
      <p class="eyebrow">Service ${String(i + 1).padStart(2, '0')}</p>
      <h2>${esc(s.name)}</h2>
    </div>
  </div>
  <div class="service__grid">
    <div class="service__copy">
      <p class="lead">${esc(s.short)}</p>
      <p>${esc(s.body)}</p>
      <a class="btn btn--primary" href="/quote/?service=${attr(s.slug)}">Get a rate on ${esc(
        s.name.toLowerCase()
      )}</a>
    </div>
    <ul class="spec-list">
      ${s.details.map((d) => `<li>${icon('check', 'icon--sm')}<span>${esc(d)}</span></li>`).join('\n      ')}
    </ul>
  </div>
</section>`
    )
    .join('\n');

  B.serviceOptions = c.services
    .map((s) => `<option value="${attr(s.name)}">${esc(s.name)}</option>`)
    .join('\n');

  // FAQ: native <details> so it works with JavaScript disabled and is
  // keyboard-accessible without any ARIA work on our part.
  B.faqList = computed.faqFilled
    .map(
      (f) => `
<details class="faq__item" name="faq">
  <summary>
    <span>${esc(f.q)}</span>
    <span class="faq__marker" aria-hidden="true"></span>
  </summary>
  <div class="faq__answer"><p>${esc(f.a)}</p></div>
</details>`
    )
    .join('\n');

  B.faqShort = computed.faqFilled
    .slice(0, 4)
    .map(
      (f) => `
<details class="faq__item" name="faq-home">
  <summary><span>${esc(f.q)}</span><span class="faq__marker" aria-hidden="true"></span></summary>
  <div class="faq__answer"><p>${esc(f.a)}</p></div>
</details>`
    )
    .join('\n');

  B.hoursList = c.contact.hours
    .map((h) => {
      const value =
        h.open && h.close ? `${formatTime(h.open)} to ${formatTime(h.close)}` : 'Closed';
      return `<div class="hours__row"><dt>${esc(h.days)}</dt><dd>${esc(value)}</dd></div>`;
    })
    .join('\n');

  const reqList = (items) =>
    items.map((r) => `<li>${icon('check', 'icon--sm')}<span>${esc(r)}</span></li>`).join('\n');

  B.driverRequirements = reqList(c.drivers.requirements);

  // The box truck block appears only once its requirements are real, since
  // publishing a guess about who is eligible wastes applicants' time.
  B.boxTruckBlock =
    filled('drivers.boxTruckRequirements') && Array.isArray(c.drivers.boxTruckRequirements)
      ? `<h3 style="margin: 2rem 0 0.75rem">Box truck, local and regional</h3>
        <ul class="spec-list">${reqList(c.drivers.boxTruckRequirements)}</ul>`
      : '';

  B.driverPositions = (c.drivers.positions || [])
    .map((p) => `<option value="${attr(p)}">${esc(p)}</option>`)
    .join('\n');

  // A grid with one lonely card looks broken, so the section only appears once
  // there are at least two real benefits to show.
  B.driverBenefits =
    computed.benefitsFilled.length >= 2
      ? computed.benefitsFilled
          .map(
            (b) => `
<div class="benefit">
  <h3>${esc(b.title)}</h3>
  <p>${esc(b.body)}</p>
</div>`
          )
          .join('\n')
      : '';

  // Pay and home time are the two things drivers scan for. Show whichever is
  // filled, and drop the callout entirely if neither is.
  const payRows = [
    filled('drivers.pay') ? `<strong>Pay:</strong> ${esc(c.drivers.pay)}` : '',
    filled('drivers.homeTime') ? `<strong>Home time:</strong> ${esc(c.drivers.homeTime)}` : '',
  ].filter(Boolean);

  B.driverPayCallout = payRows.length
    ? `<div class="callout" style="margin-top: 2.5rem; max-width: 70ch"><p>${payRows.join('<br>')}</p></div>`
    : '';

  // The whole "what you get" section disappears until there is something real
  // to put in it. A recruiting page that promises nothing specific is worse
  // than one that goes straight from the intro to the requirements.
  B.driverOfferSection =
    B.driverBenefits || B.driverPayCallout
      ? `
<section class="section section--mist">
  <div class="container">
    <div class="section__head">
      <p class="eyebrow">The offer</p>
      <h2>What you get here</h2>
      <p class="lead">
        We are not going to pretend the pay chart is the only thing that
        matters, but we are also not going to waste your time if it does not
        work.
      </p>
    </div>
    ${B.driverBenefits ? `<div class="grid grid--3">${B.driverBenefits}</div>` : ''}
    ${B.driverPayCallout}
  </div>
</section>`
      : '';

  const initials = (name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('');

  // Bio cards for each owner, shown below the founding story. A card without a
  // written bio still carries the name and role, which is the part that matters.
  B.ownerBios = `<div class="grid grid--2">${c.company.owners
    .map(
      (o, i) => `
<article class="owner">
  <div class="owner__avatar" aria-hidden="true">${esc(initials(o.name))}</div>
  <h3 class="owner__name">${esc(o.name)}</h3>
  <p class="owner__role">${esc(o.role)}</p>
  ${filled(`company.owners.${i}.bio`) ? `<p class="owner__bio">${esc(o.bio)}</p>` : ''}
</article>`
    )
    .join('\n')}</div>`;

  const storyParagraphs = (c.company.ownersStory || [])
    .map((p) => `<p>${esc(p)}</p>`)
    .join('\n    ');

  // With a real photo on disk, set the founding story beside it. Without one,
  // the story still renders on its own, so a missing file costs the page a
  // picture rather than its content.
  if (computed.ownersPhoto) {
    const photo = c.company.ownersPhoto;
    B.owners = `
<div class="owners-band">
  <figure class="owners-band__figure">
    <img src="${attr(computed.ownersPhoto)}" alt="${attr(photo.alt)}" loading="lazy" decoding="async">
    ${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ''}
  </figure>
  <div class="owners-band__story">
    ${storyParagraphs}
    <p class="owners-band__credit">${c.company.owners
      .map((o) => `<span><strong>${esc(o.name)}</strong> ${esc(o.role)}</span>`)
      .join('')}</p>
  </div>
</div>`;
  } else {
    B.owners = `<div class="owners-band owners-band--textonly"><div class="owners-band__story">${storyParagraphs}</div></div>`;
  }

  const hasStates = filled('coverage.states') && Array.isArray(c.coverage.states);
  const hasLanes = filled('coverage.lanes') && Array.isArray(c.coverage.lanes);
  const hasCoverageCopy = filled('coverage.headline') && filled('coverage.body');

  B.coverageStates = hasStates ? c.coverage.states.map((s) => `<li>${esc(s)}</li>`).join('\n') : '';

  B.coverageLanes = hasLanes
    ? c.coverage.lanes
        .map((l) => `<li>${icon('route', 'icon--sm')}<span>${esc(l)}</span></li>`)
        .join('\n')
    : '';

  if (!hasCoverageCopy && !hasStates && !hasLanes) {
    B.coverageSection = '';
  } else {
    const left = `
      <div>
        <p class="eyebrow">Where we run</p>
        <h2>${esc(c.coverage.headline)}</h2>
        <p class="lead" style="margin-top: 1rem">${esc(c.coverage.body)}</p>
        ${hasStates ? `<ul class="chip-list" style="margin-top: 1.75rem">${B.coverageStates}</ul>` : ''}
      </div>`;

    const right = hasLanes
      ? `
      <div>
        <h3 style="margin-bottom: 1rem">Lanes we run every week</h3>
        <ul class="lane-list">${B.coverageLanes}</ul>
      </div>`
      : '';

    B.coverageSection = `
<section class="section">
  <div class="container">
    <div class="${right ? 'form-shell' : ''}" ${right ? '' : 'style="max-width: 72ch"'}>
      ${left}
      ${right}
    </div>
  </div>
</section>`;
  }

  B.socialLinks = Object.entries(c.social)
    .filter(([, url]) => Boolean(url))
    .map(
      ([name, url]) =>
        `<li><a href="${attr(url)}" rel="me noopener" target="_blank">${esc(
          name[0].toUpperCase() + name.slice(1)
        )}</a></li>`
    )
    .join('\n');

  // Publishing coverage limits the company does not actually carry would be a
  // serious problem, and the placeholders here look like real dollar figures.
  // Only limits that have been confirmed get rendered.
  const insuranceRows = [
    ['Auto liability', 'authority.insurance.autoLiability', c.authority.insurance.autoLiability],
    ['Cargo insurance', 'authority.insurance.cargo', c.authority.insurance.cargo],
    [
      'General liability',
      'authority.insurance.generalLiability',
      c.authority.insurance.generalLiability,
    ],
    ['Carrier', 'authority.insurance.provider', c.authority.insurance.provider],
  ].filter(([, key]) => filled(key));

  B.insuranceBlock = insuranceRows.length
    ? `<dl style="margin-bottom: 2rem">${insuranceRows
        .map(([label, , value]) => `<div class="spec-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
        .join('\n')}</dl>`
    : `<p style="margin-bottom: 2rem">Current limits are listed on our certificate of insurance, which we issue naming your company as certificate holder before the first load. Email <a href="mailto:${attr(
        computed.emailSafety
      )}">${esc(computed.emailSafety)}</a> and it goes out the same business day.</p>`;

  B.analytics = c.site.googleAnalyticsId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${attr(
        c.site.googleAnalyticsId
      )}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${
        c.site.googleAnalyticsId
      }');</script>`
    : '';

  B.verification = c.site.googleSiteVerification
    ? `<meta name="google-site-verification" content="${attr(c.site.googleSiteVerification)}">`
    : '';

  return B;
}

// ---------------------------------------------------------------------------
// Structured data. This is what makes the business eligible for rich results
// and feeds the knowledge panel, so it is worth getting right.
// ---------------------------------------------------------------------------

function buildSchema(cfg, computed, meta) {
  const c = cfg;
  const addr = c.contact.address;

  const org = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Organization'],
    '@id': `${computed.siteUrl}/#organization`,
    name: c.company.legalName,
    alternateName: c.company.shortName,
    description: c.company.blurb,
    url: `${computed.siteUrl}/`,
    logo: `${computed.siteUrl}/assets/img/logo.svg`,
    image: `${computed.siteUrl}/og.png`,
    telephone: c.contact.phone,
    email: c.contact.email,
    foundingDate: String(c.company.foundedYear),
    founder: c.company.owners.map((o) => ({ '@type': 'Person', name: o.name })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: addr.street,
      addressLocality: addr.city,
      addressRegion: addr.state,
      postalCode: addr.zip,
      addressCountry: addr.country,
    },
    identifier: [
      { '@type': 'PropertyValue', name: 'USDOT', value: c.authority.usdot },
      { '@type': 'PropertyValue', name: 'MC', value: c.authority.mc },
    ],
    knowsAbout: c.services.map((s) => s.name),
    openingHoursSpecification: c.contact.hours
      .filter((h) => h.open && h.close)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.days,
        opens: h.open,
        closes: h.close,
      })),
  };

  if (c.contact.geo?.lat != null && c.contact.geo?.lng != null) {
    org.geo = { '@type': 'GeoCoordinates', latitude: c.contact.geo.lat, longitude: c.contact.geo.lng };
  }
  const socials = Object.values(c.social).filter(Boolean);
  if (socials.length) org.sameAs = socials;
  if (Array.isArray(c.coverage.states)) {
    org.areaServed = c.coverage.states.map((s) => ({ '@type': 'State', name: s }));
  }

  const graph = [org];

  graph.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${computed.siteUrl}/#website`,
    url: `${computed.siteUrl}/`,
    name: c.company.legalName,
    publisher: { '@id': `${computed.siteUrl}/#organization` },
  });

  if (meta.path !== '/') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${computed.siteUrl}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.breadcrumb || meta.title,
          item: `${computed.siteUrl}${meta.path}`,
        },
      ],
    });
  }

  if (meta.schema === 'faq' && computed.faqFilled.length) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: computed.faqFilled.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  if (meta.schema === 'services') {
    for (const s of c.services) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: s.name,
        description: s.short,
        serviceType: 'Freight transportation',
        provider: { '@id': `${computed.siteUrl}/#organization` },
      });
    }
  }

  return graph.map((node) => `<script type="application/ld+json">${jsonScript(node)}</script>`).join('\n');
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function build() {
  const started = Date.now();

  // Cache-bust the config import so --watch picks up edits.
  const configUrl = `${pathToFileURL(path.join(ROOT, 'site.config.js')).href}?t=${Date.now()}`;
  const raw = (await import(configUrl)).default;
  const { value: cfg, found: todos } = resolveTodos(raw);

  const currentYear = new Date().getFullYear();
  const computed = {
    // Lets blocks ask whether a value is still a placeholder, so unfilled
    // sections can omit themselves instead of publishing prompt text.
    todos: new Set(todos),
    // Entries whose content is still a placeholder are dropped outright. For the
    // FAQ this also keeps prompt text out of the FAQPage structured data, which
    // would otherwise be submitted to Google as a real answer.
    faqFilled: cfg.faq.filter((_, i) => !todos.includes(`faq.${i}.a`)),
    benefitsFilled: cfg.drivers.benefits.filter(
      (_, i) => !todos.includes(`drivers.benefits.${i}.body`)
    ),
    year: currentYear,
    years: currentYear - cfg.company.foundedYear,
    siteUrl: String(cfg.site.url).replace(/\/+$/, ''),
    phoneHref: telHref(cfg.contact.phone),
    phoneDigits: digitsOnly(cfg.contact.phone),
    addressLine: `${cfg.contact.address.street}, ${cfg.contact.address.city}, ${cfg.contact.address.state} ${cfg.contact.address.zip}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${cfg.company.legalName} ${cfg.contact.address.street} ${cfg.contact.address.city} ${cfg.contact.address.state} ${cfg.contact.address.zip}`
    )}`,
    emailSafety: cfg.contact.emailSafety || cfg.contact.email,
    emailCareers: cfg.contact.emailCareers || cfg.contact.email,
    // Optional images render only when the file is actually present, so dropping
    // one in is the whole install step and forgetting never yields a broken
    // image icon. The extension in the config is a starting guess: whatever the
    // photo actually got saved as is what gets used.
    ownersPhoto: resolveOptionalImage(cfg.company.ownersPhoto.src),
  };

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const partials = await loadPartials();
  const layout = await readFile(path.join(SRC, 'layout.html'), 'utf8');
  const pageFiles = (await readdir(PAGES)).filter((f) => f.endsWith('.html'));

  const written = [];

  for (const file of pageFiles) {
    const rawPage = await readFile(path.join(PAGES, file), 'utf8');
    const { meta, body } = parsePage(rawPage, file);

    const blocks = buildBlocks(cfg, computed, meta.path);
    const ctx = {
      ...cfg,
      $: computed,
      html: blocks,
      page: {
        ...meta,
        canonical: `${computed.siteUrl}${meta.path}`,
        ogImage: `${computed.siteUrl}/og.png`,
        bodyClass: meta.bodyClass || '',
        robots: meta.noindex ? 'noindex, follow' : 'index, follow',
      },
    };

    // Render the page body first so page-level tokens resolve, then drop the
    // result into the layout.
    const renderedBody = render(body, ctx, partials);
    const withSchema = { ...ctx, html: { ...blocks, schema: buildSchema(cfg, computed, meta) } };
    const html = render(layout, { ...withSchema, content: renderedBody }, partials);

    // "/" -> dist/index.html ; "/services/" -> dist/services/index.html
    const outPath =
      meta.path === '/'
        ? path.join(DIST, 'index.html')
        : meta.output
          ? path.join(DIST, meta.output)
          : path.join(DIST, meta.path.replace(/^\/|\/$/g, ''), 'index.html');

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf8');
    written.push({ ...meta, outPath });
  }

  // Assets and static passthrough
  if (existsSync(ASSETS)) await cp(ASSETS, path.join(DIST, 'assets'), { recursive: true });
  if (existsSync(STATIC)) await cp(STATIC, DIST, { recursive: true });

  // sitemap.xml
  const indexable = written
    .filter((p) => !p.noindex)
    .sort((a, b) => (b.priority || 0.5) - (a.priority || 0.5));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    (p) => `  <url>
    <loc>${computed.siteUrl}${p.path}</loc>
    <changefreq>${p.changefreq || 'monthly'}</changefreq>
    <priority>${(p.priority ?? 0.5).toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  // robots.txt references the sitemap, so generate it here where the URL is known.
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${computed.siteUrl}/sitemap.xml\n`,
    'utf8'
  );

  // Safety net. Sections are meant to hide themselves while their config is
  // still a placeholder, but a missed spot would publish prompt text, or worse,
  // a plausible-looking fake insurance limit. Scan the built HTML for the
  // literal placeholder strings and refuse to call the build clean if any
  // reached a page.
  // site.url has to render on every page as the canonical and og:url. It cannot
  // hide itself, and an obviously wrong domain is caught by the placeholder
  // list below rather than by this scan.
  const LEAK_EXEMPT = new Set(['site.url']);

  const placeholderText = todos
    .filter((p) => !LEAK_EXEMPT.has(p))
    .map((p) => get(raw, p))
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .map((v) => (v && typeof v === 'object' && '__todo' in v ? v.value : v))
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => typeof v === 'string' && v.length > 12);

  const leaks = [];
  for (const { outPath } of written) {
    const html = await readFile(outPath, 'utf8');
    for (const text of placeholderText) {
      if (html.includes(esc(text)) || html.includes(text)) {
        leaks.push(`${path.relative(DIST, outPath)}: "${text.slice(0, 60)}..."`);
      }
    }
  }

  const ms = Date.now() - started;
  console.log(`\n  Built ${written.length} pages in ${ms}ms -> dist/`);

  if (leaks.length) {
    console.log('\n  PLACEHOLDER TEXT REACHED A PAGE:');
    for (const l of new Set(leaks)) console.log(`    ! ${l}`);
    console.log('\n  That section should hide itself until its config is filled in.');
    process.exitCode = 1;
  }

  if (todos.length) {
    console.log(`\n  ${todos.length} placeholder${todos.length === 1 ? '' : 's'} still to fill in:`);
    for (const t of todos) console.log(`    - site.config.js -> ${t}`);
    console.log('\n  See LAUNCH-CHECKLIST.md for what each one needs.\n');
    if (FLAGS.check) process.exitCode = 1;
  } else {
    console.log('  No placeholders remaining. Ready to launch.\n');
  }

  return written;
}

// ---------------------------------------------------------------------------
// Dev server
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};

function serve(port = 3000, attemptsLeft = 10) {
  const server = http
    .createServer(async (req, res) => {
      try {
        const url = decodeURIComponent(req.url.split('?')[0]);
        let file = path.join(DIST, url);

        // Guard against path traversal out of dist/.
        if (!file.startsWith(DIST)) {
          res.writeHead(403).end('Forbidden');
          return;
        }

        if (existsSync(file) && (await stat(file)).isDirectory()) {
          file = path.join(file, 'index.html');
        }
        if (!existsSync(file)) {
          const notFound = path.join(DIST, '404.html');
          const body = existsSync(notFound) ? await readFile(notFound) : 'Not found';
          res.writeHead(404, { 'Content-Type': MIME['.html'] }).end(body);
          return;
        }

        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        res.end(await readFile(file));
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    });

  // A leftover server from a previous run is the normal reason this port is
  // taken. Step to the next one and say so, rather than dying with a stack
  // trace over something the person running it does not need to care about.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`  Port ${port} is in use, trying ${port + 1}...`);
      serve(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`\n  Could not start the server: ${err.message}\n`);
    process.exit(1);
  });

  server.listen(port, () => console.log(`\n  Serving dist/ at http://localhost:${port}\n`));
}

function startWatch() {
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build().catch((err) => console.error('  Build failed:', err.message));
    }, 80);
  };
  for (const dir of [SRC, STATIC]) {
    if (existsSync(dir)) watch(dir, { recursive: true }, trigger);
  }
  watch(path.join(ROOT, 'site.config.js'), trigger);
  console.log('  Watching for changes...');
}

try {
  await build();
  if (FLAGS.watch) startWatch();
  if (FLAGS.serve) serve(Number(process.env.PORT) || 3000);
} catch (err) {
  console.error('\n  Build failed:', err.message, '\n');
  process.exit(1);
}
