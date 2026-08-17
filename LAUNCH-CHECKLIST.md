# Launch checklist

Run `npm run check` at any time. It builds the site and lists every placeholder
still in `site.config.js`, exiting non-zero until they are all filled.

Nothing on this list requires a developer. It is all information only Cibi and
Kabangu have.

**How unfilled sections behave.** Anything still marked as a placeholder hides
itself rather than publishing prompt text. Right now that means the driver "what
you get here" section, the box truck requirements, the insurance limits table,
the state and lane lists, and two FAQ questions do not appear on the site at all.
Fill in the config and they appear. This is deliberate: a missing section costs
you less than a visible placeholder, and a fake insurance limit could cost you a
great deal more. The build fails if placeholder text ever reaches a page.

---

## 0. Worth looking into before anything else

This is not a website task, but it is probably worth more than the website.

GFK Transport is owned by two people who came from the Democratic Republic of
the Congo, one of whom is a woman. That may make the company eligible for
supplier diversity certification, and in freight that is not a symbolic label. It
is access to contracts you currently cannot bid on.

| Program | What it opens up | Where |
| --- | --- | --- |
| **DBE** (Disadvantaged Business Enterprise) | Federally funded highway and transit work. Prime contractors on these projects carry DBE participation goals they must hit, so they actively look for certified carriers | INDOT, Indiana's DBE certifying agency |
| **MBE** (Minority Business Enterprise) | Corporate supplier diversity programs. Large shippers set annual diverse-spend targets and need carriers to meet them | NMSDC, plus Indiana's state certification through the IDOA Division of Supplier Diversity |
| **WBE** (Women's Business Enterprise) | Same corporate programs, separate category. Can be held alongside MBE | WBENC, plus the same Indiana state program |

Things to check before you spend time on it:

- **Ownership split matters.** MBE generally needs 51 percent or more minority
  ownership and control. WBE needs 51 percent or more owned and controlled by
  women. As a married couple, how the LLC ownership is actually documented
  decides which of these you qualify for, and whether you can hold both.
- **DBE has a personal net worth cap** for the qualifying owner, excluding your
  primary residence and your equity in the business. It also has business size
  limits. MBE and WBE do not have a net worth test.
- **Certification takes months, not days.** Paperwork, financials, and a site
  visit. Start it before you need it.

If any of these come through, they belong on the site: a badge row on the home
page, a line in the footer, and a section on the About page. Tell me and I will
add it.

---

---

## 1. Required before the site goes live

These appear on the page as obvious placeholders. Do not launch with them.

### Forms, if you are deploying on Vercel

This is the highest-priority item on the page. **Netlify Forms does not work on
Vercel.** Without an endpoint, all three forms post nowhere and every quote
request, driver application, and contact message is lost silently.

| Config key | What to put there |
| --- | --- |
| `forms.provider` | `'external'` on Vercel or Cloudflare. `'netlify'` only if you host on Netlify |
| `forms.endpoint` | Your form service URL |

Pick a form service. Any of these takes about five minutes and needs no code:

- **Formspree**, formspree.io. 50 submissions/month free. Endpoint looks like
  `https://formspree.io/f/abcd1234`
- **Web3Forms**, web3forms.com. 250/month free, no account required
- **Basin**, usebasin.com. 100/month free

All three are already allowed by the `form-action` directive in the Content
Security Policy in `vercel.json`. If you pick a different service, add its
domain there or the browser will block the submission.

**Worth considering instead:** Netlify hosts this site just as well, and its
built-in Forms product means no third-party service, no monthly submission cap
to worry about at your volume, and submissions land in a dashboard with email
notifications. `netlify.toml` is already in the repo. If you switch, set
`forms.provider` to `'netlify'` and delete nothing else.

---

### Contact details

All filled in:

- `contact.phone` = `(260) 437-6975`
- `contact.email` = `gfktransport@frontier.net`
- `contact.address` = `13209 Hawks View Blvd, Fort Wayne, IN 46845`

The address now also drives the governing-law clause in the terms of service
("the State of Indiana", "courts serving Fort Wayne, IN") and the structured
data. Whatever you put in your Google Business Profile has to match this
character for character.

Optional: `contact.geo.lat` and `contact.geo.lng`. Right-click the office in
Google Maps and copy the coordinates. Not required, since Google will geocode
the address anyway, but an exact pin is better than a geocoded guess.

Optional but worth setting:

- `contact.geo.lat` and `contact.geo.lng`. Right-click your location in Google
  Maps and copy the coordinates. Improves the map card in local search results.
- `contact.emailSafety` and `contact.emailCareers` if you want compliance
  requests and driver applications going to different inboxes. They fall back to
  `contact.email` when left null.
- `contact.hours`. Currently set to Mon-Fri 7 to 6, Sat 8 to 2, closed Sunday.
  Correct it if that is wrong.

### Domain

| Config key | What to put there |
| --- | --- |
| `site.url` | Your real domain with `https://` and no trailing slash |

This drives every canonical tag, the Open Graph URLs, and `sitemap.xml`. Getting
it wrong will confuse search engines about which URL is the real one.

If you do not have a domain yet, buy one before launch. `gfktransport.com` if
it is available. Cloudflare and Namecheap are both around $10 a year.

### Insurance

| Config key | What to put there |
| --- | --- |
| `authority.insurance.autoLiability` | Your actual limit, for example `$1,000,000` |
| `authority.insurance.cargo` | Your actual limit, for example `$100,000` |
| `authority.insurance.generalLiability` | Your actual limit |
| `authority.insurance.provider` | Your insurance carrier's name |

These are published on `/safety/`, which is the page brokers read before booking
you. Publishing limits you do not carry is a serious problem, so put the real
numbers in or delete the section.

### Coverage area

`coverage.headline` and `coverage.body` are written, anchored on Fort Wayne's
position on I-69. Read them and confirm they describe how you actually operate.

| Config key | What to put there |
| --- | --- |
| `coverage.states` | The states you actually run. Also feeds the `areaServed` structured data |
| `coverage.lanes` | Three to six lanes you run regularly, written as `Fort Wayne, IN to Chicago, IL` |

Until these two are filled, the state chips and the lane list simply do not
render. The coverage section still shows with its headline and paragraph. Naming
real cities is what gets you found, because shippers search by lane.

### Driver recruiting

| Config key | What to put there |
| --- | --- |
| `drivers.pay` | Real pay. A per-mile range, a percentage, or a weekly average. Vague pay claims lose good drivers to carriers that publish numbers |
| `drivers.homeTime` | Your real home time policy |
| `drivers.boxTruckRequirements` | What you require for box truck drivers. See the note below |
| `drivers.benefits[0].body` | Average weekly miles you can honestly promise |
| `drivers.benefits[1].body` | Home time policy again, in benefit form |
| `drivers.benefits[2].body` | Fleet age and how you handle maintenance |
| `drivers.benefits[4].body` | Pay frequency and method |
| `drivers.benefits[5].body` | Detention and layover rates |

The drivers page now advertises two separate seats, Class A over the road and
box truck, with their own requirement lists and a dropdown on the application so
you know which one someone is applying for.

**Worth deciding before you publish `boxTruckRequirements`:** a straight truck
under 26,001 lbs GVWR does not require a CDL. If your box truck is under that
weight, you can hire from a far larger pool than Class A drivers, and saying "no
CDL required" plainly on the page is the single highest-value line on it. If you
do require a CDL for that seat, say that instead so you are not fielding
applications you cannot use.

If you stop hiring later, set `drivers.hiring` to `false` and remove Drivers from
the `nav` array.

### Owner bios

The founding story is written and live at the top of the About page:
`company.ownersStory` in the config. Read it and correct anything that is off.
It says you came from the Democratic Republic of the Congo in the 1990s, founded
the company in 2013, and are married. If any of that is stated wrong, fix it
there and it updates the page.

What is still missing is the division of labor:

| Config key | What to put there |
| --- | --- |
| `company.owners[0].bio` | What Cibi handles day to day, plus one human detail |
| `company.owners[1].bio` | What Kabangu handles day to day, same |

Two sentences each is plenty. The useful part is telling a customer who to ask
for. "Call Cibi about a rate, call Kabangu about a truck" is worth more than any
job title.

**The photo.** Save the picture of the two of you to
`src/assets/img/owners.jpg`, then rebuild. The About page detects the file and
switches from initials to a photo panel with both bios beside it. No config
change needed.

- Resize to roughly 1200px on the long edge and keep it under about 400KB, or it
  will slow the page down for no visual gain.
- The panel crops to a 3:4 portrait focused slightly above center. If the crop
  cuts badly, change `object-position` on `.owners-band__figure img` in
  `src/assets/css/styles.css`.
- Update `company.ownersPhoto.alt` if you want different alt text, and set
  `caption` if you want a line underneath.
- Worth considering: a photo of the two of you in front of one of your trucks
  would do more work here than a travel photo. Shippers are looking for evidence
  that the equipment is real.

### FAQ answers

| Config key | What to put there |
| --- | --- |
| `faq[5].a` | Your payment terms. Net 30? Quick pay available? At what discount? |
| `faq[7].a` | Hazmat: yes or no, and which classes if yes |

---

## 2. Review before launch, even though nothing is flagged

The build does not flag these because they contain real copy, but they were
written without knowing your specifics. Read them and correct anything that does
not match how you actually operate.

- **`src/pages/about.html`.** The narrative is built only from facts you gave
  (founded 2013, two owners, still owner-operated). It is accurate but generic.
  Adding the real story of why you started and what the first truck was would
  make it much stronger.
- **`site.config.js` → `services`.** Five services are configured: dry van, box
  truck, expedited, dedicated lanes, and partial truckload. Refrigerated and
  flatbed have been removed throughout, and both are now listed on the services
  page under what you do not haul. The specs inside each service (trailer
  length, payload) are typical industry figures and need checking against your
  actual equipment. Worth adding: your box truck's box length and whether it has
  a liftgate, since that is the first thing a shipper asks.
- **`src/pages/services.html`.** The "what we will not haul" list assumes no
  hazmat, no oversize, and no household goods authority. Correct it.
- **Homepage stat strip** in `src/pages/index.html`. It currently claims
  same-day quotes on weekdays and 24/7 support for freight in transit. These are
  promises, not measurements. Keep them only if you will honor them.
- **`src/pages/safety.html`.** Describes ELDs, a drug testing consortium, annual
  MVR reviews, and a preventive maintenance program. Standard for a compliant
  carrier, but confirm each one is true of your operation.

---

## 3. Legal

The privacy policy and terms of service are solid, industry-appropriate starting
points. They reference the Carmack Amendment, cargo claim procedure, and DOT
recordkeeping correctly.

They are not legal advice and I am not a lawyer. Before launch, have a
transportation attorney review `/terms/`, particularly the cargo liability and
limitation-of-liability sections. An hour of their time is cheap next to one
contested claim.

---

## 4. Technical setup

- [ ] Buy the domain
- [ ] Push this repository to GitHub
- [ ] Connect the repository to Netlify and deploy
- [ ] Point the domain at Netlify and confirm HTTPS is active
- [ ] Submit a test entry through all three forms
- [ ] Turn on email notifications in Netlify for each form, sent to an address
      someone checks hourly during business hours
- [ ] Set up email on your own domain
- [ ] Verify the domain in Google Search Console and submit
      `https://yourdomain.com/sitemap.xml`
- [ ] Paste the Search Console verification token into
      `site.config.js` → `site.googleSiteVerification`
- [ ] Create or claim the Google Business Profile, matching name, address, and
      phone exactly
- [ ] Replace `static/og.png` with a real 1200 by 630 image of your equipment
- [ ] Add photos of your actual trucks to the homepage and services page

---

## 5. Verify before you announce it

- [ ] Every phone number on the site dials correctly from a phone
- [ ] Every email link opens with the right address
- [ ] All three forms arrive in the right inbox
- [ ] The site reads well on an actual phone, not just a narrow browser window
- [ ] The FMCSA link opens your record and it shows the authority as active
- [ ] Search your company name and confirm nothing outdated outranks the new site
- [ ] Run the homepage through <https://pagespeed.web.dev> and confirm the
      accessibility score is 100
- [ ] Test the site with the keyboard alone: Tab through the navigation, open the
      mobile menu, submit a form
