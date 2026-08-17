/**
 * GFK Transport LLC - single source of truth for site content.
 *
 * Anything wrapped in TODO() is a placeholder that must be replaced before
 * launch. `npm run build` prints a checklist of every TODO still present and
 * `npm run check` exits non-zero if any remain, so nothing ships half-filled.
 *
 * Editing this file is how you change the site. You should not need to touch
 * the HTML in src/pages for routine updates like a new phone number, a new
 * service, or a new FAQ entry.
 */

const TODO = (value) => ({ __todo: true, value });

export default {
  // ---------------------------------------------------------------------------
  // Core identity
  // ---------------------------------------------------------------------------
  company: {
    legalName: 'GFK Transport LLC',
    shortName: 'GFK Transport',
    initials: 'GFK',
    tagline: 'Freight that shows up when we said it would.',
    // Used in the meta description and the About page opener.
    blurb:
      'GFK Transport LLC is an owner-operated carrier running dry van and box ' +
      'truck capacity for shippers who are tired of chasing their own loads ' +
      'for status updates.',
    foundedYear: 2013,
    // Rendered as "N years" across the site. Recomputed at build time from
    // foundedYear so it never goes stale.
    ownersLabel: 'Cibi Muhindo and Kabangu Biayi',
    // Photo of both owners, shown on the About page. Save the image to the path
    // below and it appears automatically. If the file is not there, the page
    // falls back to initials, so a missing photo never breaks the layout.
    // Save it around 1200px on the long edge and keep it under ~400KB.
    ownersPhoto: {
      src: '/assets/img/owners.jpg',
      alt: 'Cibi Muhindo and Kabangu Biayi, the married couple who own GFK Transport LLC',
      caption: null, // optional line under the photo
    },
    // The founding story, rendered beside the owner photo on the About page.
    // Each string is a paragraph.
    ownersStory: [
      'Cibi Muhindo and Kabangu Biayi came to the United States from the ' +
        'Democratic Republic of the Congo in the 1990s. Like most people who ' +
        'make that trip, they arrived looking for opportunity, then spent years ' +
        'doing the unglamorous work of building it.',
      'In 2013 they founded GFK Transport on their own authority, with their ' +
        'own equipment. They still own it and they still run it. No holding ' +
        'company, no parent brand, no investor who bought the name and kept it ' +
        'on the door.',
      'They are also married, which is worth saying plainly because it explains ' +
        'how this company operates. A family business does not get to separate ' +
        'its reputation from its family. When we tell you a load will be there ' +
        'Tuesday, the people making that promise are the people whose name is ' +
        'on it.',
    ],
    owners: [
      {
        name: 'Cibi Muhindo',
        role: 'Co-Owner',
        // What each of them actually handles day to day is the one thing still
        // missing. Two sentences each is plenty. Naming who a customer reaches
        // for what is more useful than a job title.
        bio: TODO(
          'What Cibi handles day to day. Dispatch, customer relationships, ' +
            'billing, safety? Add one detail that makes her a person rather ' +
            'than a title.'
        ),
      },
      {
        name: 'Kabangu Biayi',
        role: 'Co-Owner',
        bio: TODO(
          'What Kabangu handles day to day. Operations, maintenance, driver ' +
            'management, scheduling? Add one detail that makes him a person ' +
            'rather than a title.'
        ),
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Regulatory identifiers. These are real and verified against FMCSA records.
  // Brokers and shippers will look these up before they book you, so they get
  // top billing in the header, the footer, and the Safety page.
  // ---------------------------------------------------------------------------
  authority: {
    usdot: '2367819',
    mc: '812027',
    // FMCSA public lookup. Linking straight to your own record is a strong
    // trust signal: it says "go check us yourself".
    saferUrl:
      'https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=2367819',
    // Certificate of insurance. Upload the PDF to static/docs/ and point here,
    // or leave as null to render a "request by email" link instead.
    insuranceCertUrl: null,
    w9Url: null,
    insurance: {
      autoLiability: TODO('$1,000,000'),
      cargo: TODO('$100,000'),
      generalLiability: TODO('$1,000,000'),
      provider: TODO('Name of your insurance carrier'),
    },
  },

  // ---------------------------------------------------------------------------
  // Contact. Local SEO depends on this being byte-identical everywhere it
  // appears online (site, Google Business Profile, directories). That is the
  // entire reason it lives in one place here.
  // ---------------------------------------------------------------------------
  contact: {
    phone: '(260) 437-6975',
    phoneAfterHours: null, // optional second number for night/weekend dispatch
    email: 'gfktransport@frontier.net',
    emailSafety: null, // optional, falls back to email
    emailCareers: null, // optional, falls back to email
    address: {
      street: '13209 Hawks View Blvd',
      city: 'Fort Wayne',
      state: 'IN',
      // Spelled out for the governing-law clause in the terms of service, where
      // "the State of IN" would read badly.
      stateName: 'Indiana',
      zip: '46845',
      country: 'US',
    },
    // Decimal degrees. Used for LocalBusiness structured data. Find yours by
    // right-clicking your location in Google Maps.
    geo: { lat: null, lng: null },
    hours: [
      { days: 'Monday to Friday', open: '07:00', close: '18:00' },
      { days: 'Saturday', open: '08:00', close: '14:00' },
      { days: 'Sunday', open: null, close: null }, // null/null renders "Closed"
    ],
    hoursNote: 'Loads in transit are covered around the clock. Call anytime.',
  },

  social: {
    facebook: null,
    linkedin: null,
    instagram: null,
  },

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------
  site: {
    // No trailing slash. Drives canonical tags, Open Graph URLs, and sitemap.xml.
    url: TODO('https://gfktransport.com'),
    locale: 'en_US',
    // Set once you have a property. Leave null and no analytics script renders.
    googleAnalyticsId: null,
    googleSiteVerification: null,
  },

  // ---------------------------------------------------------------------------
  // Services. Order here is the order they render. `icon` maps to an inline SVG
  // defined in build.mjs; valid values are listed there.
  // ---------------------------------------------------------------------------
  services: [
    {
      slug: 'dry-van',
      icon: 'van',
      name: 'Dry Van',
      short: '53-foot enclosed trailers for palletized and floor-loaded freight.',
      body:
        'The workhorse of our fleet. Consumer goods, packaged food, paper, ' +
        'building materials, and general palletized freight move in clean, ' +
        'dry, swept trailers. We load by pallet or floor-load to the nose ' +
        'when cube matters more than count.',
      details: [
        '53-foot air-ride trailers',
        'Up to 45,000 lbs payload',
        'Swept and inspected between every load',
        'Load bars and straps carried as standard',
      ],
    },
    {
      slug: 'box-truck',
      icon: 'boxtruck',
      name: 'Box Truck',
      short: 'Straight trucks for freight a 53-foot trailer cannot reach.',
      body:
        'Not every delivery has a loading dock and a yard big enough to swing ' +
        'a tractor-trailer. Box trucks get into tight commercial districts, ' +
        'strip centers, job sites, and residential streets, and they can ' +
        'deliver without a dock at all.',
      details: [
        'Straight trucks for smaller and local loads',
        'Deliveries to sites with no dock access',
        'Tight urban and residential access',
        'Right-sized capacity, so you are not paying for empty trailer',
      ],
    },
    {
      slug: 'expedited',
      icon: 'clock',
      name: 'Expedited and Hot Shot',
      short: 'Direct runs when the load cannot wait for a normal schedule.',
      body:
        'Line-down situations, missed connections, and recovery loads. ' +
        'Expedited freight goes direct with no intermediate stops, and you ' +
        'get the driver dispatch notes rather than a ticket number.',
      details: [
        'Direct, non-stop routing',
        'Team capacity available on request',
        'Same-day pickup where equipment allows',
        'Status updates at pickup, midpoint, and delivery',
      ],
    },
    {
      slug: 'dedicated',
      icon: 'route',
      name: 'Dedicated Lanes',
      short: 'Committed weekly capacity on the lanes you run constantly.',
      body:
        'If you ship the same lane every week, spot-quoting it every week is ' +
        'costing you money and certainty. Dedicated agreements lock in ' +
        'capacity and a rate, and the same drivers learn your docks, your ' +
        'receivers, and your paperwork.',
      details: [
        'Contracted weekly or monthly capacity',
        'Rate locked for the agreement term',
        'Consistent drivers on your account',
        'Volume and multi-lane pricing',
      ],
    },
    {
      slug: 'partial',
      icon: 'stack',
      name: 'Partial and Volume LTL',
      short: 'For freight too big for parcel and too small for a full trailer.',
      body:
        'You pay for the space you use instead of a whole trailer. Partials ' +
        'move with fewer handoffs than traditional LTL, which means less ' +
        'damage and less time in terminals.',
      details: [
        '6 to 30 linear feet',
        'Fewer touches than terminal-based LTL',
        'No reclass surprises on the invoice',
        'Palletized and crated freight',
      ],
    },
  ],

  // ---------------------------------------------------------------------------
  // Operating area. Edit to match reality. `states` drives the coverage list and
  // the areaServed field in structured data.
  // ---------------------------------------------------------------------------
  coverage: {
    headline: 'Based in Fort Wayne, positioned for the Midwest',
    body:
      'Fort Wayne sits on I-69, with I-80, I-90, I-70, and I-75 all inside a ' +
      'half day. Chicago, Indianapolis, Detroit, Columbus, Cincinnati, and ' +
      'Cleveland are comfortable reach from the yard. Tell us where your ' +
      'freight needs to go and we will tell you straight whether it fits our ' +
      'network or whether you are better off with someone else.',
    // States and lanes stay hidden on the site until these are filled in, so
    // the page never shows a visitor a placeholder. Naming real cities is what
    // gets you found, because shippers search by lane.
    states: TODO(['List', 'the', 'states', 'you', 'run']),
    lanes: TODO([
      'Fort Wayne, IN to Chicago, IL',
      'Add three to six lanes you genuinely run',
    ]),
  },

  // ---------------------------------------------------------------------------
  // Driver recruiting. This page pays for the whole site if you are hiring.
  // ---------------------------------------------------------------------------
  drivers: {
    hiring: true,
    headline: 'Drive for people who answer the phone.',
    intro:
      'We are a small carrier, which means dispatch knows your name, your ' +
      'home time is a commitment and not a maybe, and the person deciding ' +
      'your load is one of the owners.',
    pay: TODO('Describe pay: per-mile range, percentage, or weekly average'),
    homeTime: TODO('For example: out 10 to 14 days, home 2 to 3 days'),
    // Roles you are hiring for. Drives the dropdown on the application form.
    positions: ['Class A CDL, over the road', 'Box truck driver, local and regional'],
    requirements: [
      'Valid Class A CDL',
      'Minimum 2 years verifiable OTR experience',
      'Clean MVR, no more than 2 moving violations in 3 years',
      'No DUI or reckless driving in the last 5 years',
      'Able to pass DOT physical and drug screen',
      'Legally authorized to work in the United States',
    ],
    // Box truck requirements are usually looser than Class A, and a straight
    // truck under 26,001 lbs GVWR does not require a CDL at all. That widens
    // your hiring pool considerably, so it is worth stating plainly rather than
    // letting non-CDL drivers assume they cannot apply.
    boxTruckRequirements: TODO([
      'State what you actually require here',
      'For example: valid driver license, no CDL required',
      'Minimum years of commercial driving experience',
      'Clean MVR and ability to pass a drug screen',
    ]),
    benefits: [
      { title: 'Consistent miles', body: TODO('Average weekly miles you can honestly promise') },
      { title: 'Home time you can plan around', body: TODO('Your real home time policy') },
      { title: 'Newer, maintained equipment', body: TODO('Fleet age and maintenance approach') },
      { title: 'Direct line to the owners', body: 'No dispatch bureaucracy. You call, an owner picks up.' },
      { title: 'Paid on schedule', body: TODO('Pay frequency and method, for example weekly direct deposit') },
      { title: 'Detention and layover paid', body: TODO('Your detention and layover rates') },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAQ. Rendered on /faq/ and emitted as FAQPage structured data, which is what
  // produces the expandable results in Google.
  // ---------------------------------------------------------------------------
  faq: [
    {
      q: 'Are you a carrier or a broker?',
      a: 'We are an asset-based motor carrier. We haul freight on our own authority with our own equipment and our own drivers. Your load is not re-posted to a load board after you book it.',
    },
    {
      q: 'How do I verify your authority and insurance?',
      a: 'Look us up with the FMCSA directly using USDOT 2367819 or MC 812027. We will send a certificate of insurance naming you as certificate holder before the first load, and our W-9 on request.',
    },
    {
      q: 'How fast can I get a rate?',
      a: 'Send the lane, the commodity, the weight, and the pickup window and you will have a rate the same business day. Most quotes go out within a couple of hours.',
    },
    {
      q: 'What do you need from me to book a load?',
      a: 'Pickup and delivery addresses with contacts, the commodity and its weight, dimensions or pallet count, any appointment times, and any special handling such as dock access, driver assist, or an appointment window.',
    },
    {
      q: 'Do you provide proof of delivery?',
      a: 'Yes. Signed BOL and POD are sent after delivery, normally the same day the load is delivered.',
    },
    {
      q: 'What are your payment terms?',
      a: TODO('State your terms, for example: net 30 on approved credit, quick-pay available at a discount.'),
    },
    {
      q: 'What happens if my freight is damaged?',
      a: 'Note it on the delivery receipt before the driver leaves, photograph it, and call us the same day. We file the claim against our cargo policy and stay on it until it closes.',
    },
    {
      q: 'Do you handle hazmat?',
      a: TODO('Answer yes or no. If yes, list your endorsement and which hazard classes you accept.'),
    },
  ],

  // ---------------------------------------------------------------------------
  // Forms. The quote form is the single most valuable thing on this site, so
  // where it posts is not a detail.
  //
  //   provider: 'netlify'  Netlify Forms. No endpoint needed, no backend code,
  //                        submissions appear in the Netlify dashboard. Only
  //                        works when the site is hosted on Netlify.
  //
  //   provider: 'external' Posts to `endpoint`. Use this on Vercel, Cloudflare
  //                        Pages, or anywhere that is not Netlify. Works with
  //                        Formspree, Web3Forms, Basin, or your own API route.
  //
  // A form pointed at the wrong provider fails silently. The visitor sees a
  // success page and you never get the lead, so the build refuses to call
  // itself clean until this is set correctly for wherever you actually deploy.
  // ---------------------------------------------------------------------------
  forms: {
    provider: 'external',
    endpoint: TODO('https://formspree.io/f/YOUR_FORM_ID'),
  },

  // ---------------------------------------------------------------------------
  // Navigation. Order here is the order in the header.
  // ---------------------------------------------------------------------------
  nav: [
    { label: 'Services', href: '/services/' },
    { label: 'Safety', href: '/safety/' },
    { label: 'About', href: '/about/' },
    { label: 'Drivers', href: '/drivers/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'Contact', href: '/contact/' },
  ],

  // Legal boilerplate. Reviewed-by-a-lawyer is always better than reviewed-by-me.
  legal: {
    privacyUpdated: '2026-08-17',
    termsUpdated: '2026-08-17',
  },
};

export { TODO };
