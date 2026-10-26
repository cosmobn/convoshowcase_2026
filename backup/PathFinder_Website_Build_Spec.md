# PathFinder ICT — Website Build Spec

> A mobile-first, shareable career-path finder for students in Brunei.
> **The user says what job they want → says where they are now → sees a step-by-step roadmap of how to get there.**
> Data source: Brunei ICT Industry Competency Framework (https://www.biicf.bn). No database required.

---

## 1. Product summary

| Item | Decision |
|---|---|
| Working name | **PathFinder ICT** (placeholder — rename freely) |
| Audience | Secondary, A-Level/HNTec, HND and degree students; early-career ICT workers |
| Core promise | "Tell us your dream ICT job. We'll show you the road." |
| Primary device | Mobile phone (students share via Instagram, TikTok, WhatsApp) |
| Backend | **None.** Static site + one JSON data file |
| Hosting | GitHub Pages / Netlify / Vercel (free) |
| Brand colours | Navy `#202959` · Yellow `#fdd00d` |

### Non-negotiables
1. Users reach a result in **3 taps or fewer** after landing.
2. Every result is a **shareable link** that reopens the same roadmap.
3. Works without login, cookies or tracking.
4. Clearly labelled as an **unofficial guide based on BIICF**, linking back to biicf.bn. Do **not** use the AITI, MISC or BIICF logos.

---

## 2. User flow

```
[ Landing ]
   │  "What do you want to become?"
   │   ├─ type → autocomplete (titles + nicknames)
   │   ├─ tap a sector chip → pick a role
   │   └─ "Not sure?" → 5-question quiz → suggested roles
   ▼
[ Where are you now? ]
   │  O Level · A Level / HNTec · HND / Diploma · Bachelor's · Already working
   │  (optional) years of experience slider 0–15
   ▼
[ Your Roadmap ]
   │  Animated path from the user's current point to the goal
   │  Each step: what you do · qualification · experience · skills · certifications
   │  Status per step: ✅ You qualify now · ⏳ Needs experience · 🎓 Needs higher qualification
   ▼
[ Share / Explore ]
      Share card (image + link) · Compare with another career · Browse all careers
```

URL state (deep-linkable, no DB):

```
/?goal=ciso&from=hnd&exp=0
```

| Param | Values |
|---|---|
| `goal` | role `id` from `roles.json` |
| `from` | `olevel` (BDQF 3) · `alevel` (BDQF 4) · `hnd` (BDQF 5) · `degree` (BDQF 6) · `working` |
| `exp` | integer years of experience (optional, default 0) |

---

## 3. Screens

### 3.1 Landing — "What do you want to become?"

**Layout (mobile)**
- Full-height navy hero (`#202959`).
- Headline in white: **"What do you want to become?"**
- A large search field with an animated placeholder cycling through: *Data Scientist… Ethical Hacker… App Developer… CISO… Network Engineer…*
- Below it, **6 sector chips** (scrollable row): IT Services · Network · Apps & Software · Cyber Security · Digital Media · Data & AI.
- A yellow text button: **"Not sure? Take the 30-second quiz →"**
- Below the fold: a "Trending careers" row of 6 role cards (Data Scientist, CISO, Applications Developer, AI Engineer, Network Engineer, Digital Marketing Executive).

**Search behaviour**
- Fuzzy match against `title` **and** `aka` (nicknames). For example, "web developer" finds Applications Developer, "hacker" finds Associate Security Analyst, and "SEO" finds Digital Marketing Executive.
- Show up to 6 suggestions with a sector colour dot and stage label.
- Enter or tap goes to screen 3.2.

### 3.2 "Where are you now?"
- Title: **"Where are you right now?"**
- 5 large tappable cards, one tap each:

| Card | Sub-label | BDQF |
|---|---|---|
| 🎒 Secondary school | O Level | 3 |
| 📘 Pre-university | A Level, HNTec | 4 |
| 🎓 HND / Diploma | Level 5 | 5 |
| 🏛️ Bachelor's degree | Level 6 | 6 |
| 💼 Already working | pick your qualification next | — |

- "Already working" reveals the 4 qualification options plus a **years-of-experience slider (0–15)**.
- A back arrow returns to the previous step, and the chosen goal stays visible at the top as a pill.

### 3.3 Your Roadmap (the hero screen)

**Header**
- "Your road to **{Role Title}**" (role title highlighted in yellow)
- 3 stat chips:
  - 🪜 **{n} steps**
  - ⏱️ **~{y} years' experience needed at the top step** (see the calculation in §6)
  - 🧭 Sector name in its sector colour

**Roadmap**
- **Mobile:** a vertical timeline. A thick line draws itself from top to bottom (SVG stroke animation, about 1.2 s), and the nodes pop in one after another.
- **Desktop (≥ 1024px):** a horizontal flow left to right, with the full sector map faded in the background and the chosen path highlighted.
- The first node is a **"You are here"** marker: the user's current qualification.
- If the user's qualification is below the first role's minimum, insert a **🎓 Study step** node (e.g. "Get an HND (BDQF 5)").
- Each role node is a card:

```
┌──────────────────────────────────────┐
│ STEP 2 · Mid-career        ⏳ 4 yrs   │
│ Cyber Risk Analyst                    │
│ Assesses cyber risks and controls.    │
│ ▸ Tap to see how to get here          │
└──────────────────────────────────────┘
```

- An expanded card shows:
  - **Qualification:** every entry route, with the user's route highlighted
  - **Experience needed**
  - **Skills to build:** a small bar for each skill from 1 to 5, filled in yellow up to the required level
  - **Certifications:** chips; tap one to search the web for it
  - **Soft skills:** one line, e.g. "Advanced"
  - **Source link:** "Full details on biicf.bn ↗"
- **Branches:** where the path splits (e.g. Data Analyst goes to either Data Engineer or AI Engineer), show a small toggle on the split node: "Route A / Route B".

**Status badges (per role node)**

| Badge | Rule |
|---|---|
| ✅ You qualify now | user BDQF ≥ route BDQF **and** user experience ≥ route years |
| ⏳ Needs {x} yrs experience | qualification met, experience not |
| 🎓 Needs BDQF {n} | qualification not met on any route |
| ℹ️ Details coming soon | `unavailable: true` (Data Architect) |

**Sticky bottom bar (mobile):** `[ Share my path ]` (yellow) · `[ Try another job ]` (outline)

### 3.4 Share
- Generate a 1080×1350 portrait card (good for Instagram) in the browser using `<canvas>` or `html-to-image`. The card shows:
  - Navy background with a yellow path line
  - "My road to **CISO** 🚀"
  - The step titles in a stacked list
  - The site URL and a QR code for the deep link
- Buttons: **Share** (Web Share API with the image file, falling back to download) · **Copy link** · **WhatsApp** (`https://wa.me/?text=...`).
- Toast after copying: "Link copied — send it to a friend 👀".

### 3.5 "Not sure?" quiz (5 questions, no DB)
Each answer adds points to one or more sectors. The result shows the top sector and its 3 entry roles.

| # | Question | Answers → sector points |
|---|---|---|
| 1 | Which sounds most fun? | Fixing computers → IT · Building an app → Apps · Catching hackers → Security · Finding patterns in data → Data · Connecting cities with networks → Network · Growing a brand online → Digital |
| 2 | Pick a weekend project | Build a PC → IT/Network · Make a game → Apps · Capture-the-flag challenge → Security · Analyse football stats → Data · Run a TikTok page → Digital |
| 3 | You prefer working with… | Machines → IT/Network · Code → Apps · Rules & risks → Security · Numbers → Data · People → Digital |
| 4 | Your strongest subject | Maths → Data · Computing → Apps · Physics → Network · Business → Digital · ICT → IT |
| 5 | Dream workplace | Bank → Security · Telco → Network · Start-up → Apps · Agency → Digital · Government → IT · Tech giant → Data |

### 3.6 Explore all careers
- A grid of the 39 role cards, filterable by sector chips and stage (Entry, Mid, Senior, Top).
- A **Compare** toggle lets the user pick 2 roles to see side by side: qualification, experience, top skills and certifications.

---

## 4. Visual design system

### Colour tokens
```css
:root {
  --navy: #202959;        /* primary, hero backgrounds, headings on light */
  --navy-700: #171d42;    /* pressed states, footer */
  --navy-100: #e8eaf4;    /* light surfaces */
  --yellow: #fdd00d;      /* CTA, path line, highlights, skill bars */
  --yellow-600: #e0b800;  /* CTA hover */
  --ink: #12142b;         /* body text on light */
  --muted: #5d6280;
  --surface: #ffffff;
  --bg: #f6f7fb;

  /* sector accents (dots, chips, node borders) */
  --s-it: #4f7cff;
  --s-network: #00b3a4;
  --s-apps: #8b5cf6;
  --s-security: #ef4444;
  --s-digital: #f97316;
  --s-data: #10b981;
}
```
**Contrast rules**
- Yellow is for **backgrounds, lines and bars**. Never put yellow text on white.
- On yellow buttons use navy text. On navy, use white or yellow text.
- Every text pairing must reach a WCAG AA contrast of 4.5:1.

### Typography
- Headings: **Plus Jakarta Sans** 800 (Google Fonts)
- Body: **Inter** 400/500
- Scale (mobile): Hero 36/40 · H2 24/30 · Card title 18/24 · Body 15/22 · Caption 12/16

### Shape & motion
- Radius: cards 20px, chips 999px, buttons 14px
- Shadow: `0 8px 24px rgba(32,41,89,.12)`
- Motion: path draw 1.2 s ease-out; node stagger 80 ms; card expand 200 ms
- Respect `prefers-reduced-motion`: no drawing animation, nodes appear instantly
- Micro-delight: a small confetti burst in yellow and navy when the roadmap first finishes drawing. Show it once per session, and not at all under reduced motion.

### Components
`SearchBox` · `SectorChip` · `ChoiceCard` · `StatChip` · `RoadmapNode` · `SkillBar` · `CertChip` · `StatusBadge` · `BranchToggle` · `ShareSheet` · `QuizCard` · `RoleCard` · `CompareTable` · `Toast` · `Footer`

### Microcopy
- Landing sub-line: "Pick a dream job. See the steps. Share your path."
- Empty search: "No match yet — try 'developer', 'security' or 'data'."
- Study step: "First, level up your qualification to {BDQF label}."
- Footer: "Unofficial student guide based on the Brunei ICT Industry Competency Framework (biicf.bn). Always check the official site for the latest requirements."

---

## 5. Tech stack & file structure

**Default: vanilla HTML, CSS and JS with no build step.** It is easy to host and maintain. React or Vite is fine if preferred, and the logic is the same.

```
/index.html          # single page, sections shown/hidden by state
/css/styles.css
/js/app.js           # routing (URL params), rendering
/js/path.js          # path-finding + status logic (§6)
/js/share.js         # share card + Web Share API
/js/quiz.js
/data/roles.json     # §7
/data/sectors.json   # §7
/assets/og-image.png # default social preview (1200×630)
```

- Libraries (all optional, via CDN): `html-to-image` for the share card, `qrcode` for the QR code, `canvas-confetti` for the confetti.
- SEO and social: set `<title>`, `<meta description>`, Open Graph and Twitter card tags. Update the document title on the roadmap screen, e.g. "Road to CISO · PathFinder ICT".
- Analytics (optional): a privacy-friendly tool such as Plausible or GoatCounter, tracking only `goal` + `from`.
- Performance budget: under 150 KB JS, LCP under 2 s on 4G, Lighthouse 90+ in every category.

---

## 6. Path-finding logic

### 6.1 Build the path
1. `roles.json` defines a directed graph through each role's `next` array.
2. Find **entry roles** for the goal's sector: roles that no other role points to.
3. Run BFS from the entry roles to `goal` and take the **shortest** chain. On a tie, take the route through the first listed `next`.
4. Find any **alternative** chain of the same or similar length. If one exists, show the branch toggle.

```js
// path.js
export function findPaths(roles, goalId) {
  const byId = Object.fromEntries(roles.map(r => [r.id, r]));
  const sector = byId[goalId].sector;
  const inSector = roles.filter(r => r.sector === sector);
  const hasParent = new Set(inSector.flatMap(r => r.next));
  const entries = inSector.filter(r => !hasParent.has(r.id)).map(r => r.id);

  const paths = [];
  const queue = entries.map(id => [id]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === goalId) { paths.push(path); continue; }
    for (const n of byId[last].next) {
      if (!path.includes(n)) queue.push([...path, n]);
    }
  }
  paths.sort((a, b) => a.length - b.length);
  return paths; // paths[0] = main route, paths[1] = alternative (if any)
}
```

### 6.2 Status for each step
```js
const FROM_BDQF = { olevel: 3, alevel: 4, hnd: 5, degree: 6 };

export function stepStatus(role, userBdqf, userYears) {
  if (role.unavailable) return { type: 'info' };
  const eligible = role.routes.filter(r => userBdqf >= r.bdqf);
  if (!eligible.length) {
    const minB = Math.min(...role.routes.map(r => r.bdqf));
    return { type: 'study', needBdqf: minB };
  }
  const best = eligible.reduce((a, b) => ((a.years ?? 0) <= (b.years ?? 0) ? a : b));
  const need = best.years ?? 0;
  return userYears >= need
    ? { type: 'ok', route: best }
    : { type: 'experience', years: need - userYears, route: best };
}
```

### 6.3 Header numbers
- **Steps** = number of role nodes on the main path.
- **Years** = the experience required by the **goal** role on the user's best route (or the BDQF 5 route if the user is below BDQF 5). BIICF experience is cumulative, so do **not** add up years across steps.
- If the user's BDQF is below the first role's minimum, add a 🎓 Study node before it.

### 6.4 Test cases (must pass)

| goal | from | Expected path | Header years | First ✅ step |
|---|---|---|---|---|
| `ciso` | `hnd` | Associate Security Analyst → Cyber Risk Analyst → Security Engineer → Cyber Risk Manager → CISO | 12 | Associate Security Analyst |
| `ciso` | `degree` | same | 10 | Cyber Risk Analyst (Security Engineer also ✅) |
| `data-scientist` | `olevel` | 🎓 Study (BDQF 4) → Data Entry → Data Analyst → Data Engineer → Data Architect → BI Director → Data Scientist; alt route via AI Engineer → Data Manager | 10 (BDQF 5 route) | none until study is done |
| `applications-developer` | `hnd` | Junior Programmer → Applications Developer | 5 | Junior Programmer |
| `cio` | `degree` | IT Technician → IT Administrator / Manager → Systems Engineer → Project Manager → IT Operations Manager → CIO; alt via Project Coordinator | 10 | IT Technician |
| `marketing-manager` | `hnd` | Market Analyst → Digital Marketing Executive → Business Development Manager → Marketing Manager; alt via Customer Experience Manager | 8 | none (Market Analyst needs 5 yrs) |

---

## 7. Data

### 7.1 `sectors.json`
```json
[
  { "id": "it-services", "name": "IT Services", "short": "IT Services", "color": "#4f7cff", "emoji": "🖥️" },
  { "id": "telecom-network", "name": "Telecommunications and Network", "short": "Network", "color": "#00b3a4", "emoji": "📡" },
  { "id": "apps-solutions", "name": "Applications and Solutions Development", "short": "Apps & Software", "color": "#8b5cf6", "emoji": "💻" },
  { "id": "ict-security", "name": "ICT Security", "short": "Cyber Security", "color": "#ef4444", "emoji": "🛡️" },
  { "id": "digital-media", "name": "Digital Media", "short": "Digital Media", "color": "#f97316", "emoji": "📣" },
  { "id": "data-ai", "name": "Data and Artificial Intelligence", "short": "Data & AI", "color": "#10b981", "emoji": "📊" }
]
```

### 7.2 `roles.json` schema
| Field | Type | Meaning |
|---|---|---|
| `id` | string | URL-safe unique id |
| `title` | string | Display name |
| `sector` | string | `sectors.json` id |
| `stage` | `entry` · `mid` · `senior` · `top` | For colour and filtering (PathFinder grouping, not a BIICF field) |
| `aka` | string[] | Nicknames and alternate titles for search |
| `summary` | string | One line on what the person does |
| `next` | string[] | Role ids this role progresses to |
| `routes` | object[] | Entry routes: `bdqf` (min level), `years` (min experience, `null` = "some, unspecified"), `note` |
| `skills` | [name, level][] | Key technical skills and required level (1–5; "3→4" = rises within the role) |
| `soft` | string | Soft-skill level summary |
| `certs` | string[] | Recommended certifications or training |
| `url` | string | Official BIICF page |
| `unavailable` | boolean | Optional; true if details are missing |

### 7.3 `roles.json` (complete — 39 roles)
```json
[
  {
    "id": "it-technician", "title": "IT Technician", "sector": "it-services", "stage": "entry",
    "aka": ["IT Support", "Help Desk Specialist", "IT Support Engineer", "Technical Support", "IT Generalist"],
    "summary": "Sets up equipment, fixes PCs and networks, and runs help-desk support.",
    "next": ["it-administrator-manager", "project-coordinator"],
    "routes": [
      { "bdqf": 2, "years": null, "note": "Level 1 — BDQF 2 in IT plus industry experience" },
      { "bdqf": 3, "years": 0, "note": "Level 2 — BDQF 3 in IT or related field" },
      { "bdqf": 4, "years": 0, "note": "Level 3 — BDQF 4 (or BDQF 3 + industry certification)" }
    ],
    "skills": [["Information Security Management", "2–3"], ["Software Testing", "2–3"], ["Infrastructure Management", "1–2"], ["Database Management", "1–2"], ["Telecom Network Management", "1–2"]],
    "soft": "Basic → Intermediate",
    "certs": ["CompTIA A+", "CompTIA Network+", "CompTIA Security+", "Cisco CCT", "Cisco CCNA", "Microsoft 365 Fundamentals"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/it-technician/"
  },
  {
    "id": "it-administrator-manager", "title": "IT Administrator / Manager", "sector": "it-services", "stage": "mid",
    "aka": ["System Administrator", "Sysadmin", "Server Administrator", "MIS Manager"],
    "summary": "Runs day-to-day IT operations, assets, budget and the IT team.",
    "next": ["systems-engineer"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IT, IS or Computer Science" },
      { "bdqf": 5, "years": null, "note": "BDQF 5 + industry experience or a relevant portfolio" }
    ],
    "skills": [["Business Analysis", "3→4"], ["Budgeting", "2→4"], ["Service Level Management", "3→4"], ["Procurement", "3→4"], ["IT Project Management", "3→4"]],
    "soft": "Intermediate → Advanced",
    "certs": ["ITIL", "CompTIA Network+", "CompTIA Project+", "Linux / Red Hat Sysadmin", "COBIT 5 Foundation"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/it-administrator-manager/"
  },
  {
    "id": "project-coordinator", "title": "Project Coordinator", "sector": "it-services", "stage": "entry",
    "aka": ["Project Assistant", "Project Administrator", "Project Planner", "Project Scheduler"],
    "summary": "Supports the project manager with plans, resources and schedules.",
    "next": ["systems-engineer"],
    "routes": [
      { "bdqf": 5, "years": 0, "note": "BDQF 5" },
      { "bdqf": 0, "years": null, "note": "Any qualification + a project management certification and experience" }
    ],
    "skills": [["IT Project Management", "3"], ["Business Analysis", "3"], ["Business Risk Management", "3"], ["Vendor Management", "3"], ["Contract Management", "3"]],
    "soft": "Intermediate (Advanced in Communication & Team Work)",
    "certs": ["CAPM", "CompTIA Project+", "PRINCE2 Foundation", "APM PFQ", "Microsoft Project"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/project-coordinator/"
  },
  {
    "id": "systems-engineer", "title": "Systems Engineer", "sector": "it-services", "stage": "mid",
    "aka": ["IT Engineer", "Infrastructure Engineer", "Hardware Engineer", "Technical Engineer"],
    "summary": "Deploys and maintains servers, systems, cloud and vendor solutions.",
    "next": ["project-manager"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IT, CS or Software Engineering" },
      { "bdqf": 5, "years": 0, "note": "BDQF 5 + relevant industry certification" }
    ],
    "skills": [["System Integration", "4"], ["Vendor Management", "4"], ["Cloud Computing", "3"], ["IT Architecture", "3"], ["Information Security Management", "3"]],
    "soft": "Advanced",
    "certs": ["Cisco CCNA", "CompTIA Server+", "ITIL 4 Foundation", "Microsoft Azure Fundamentals", "VMware VCP", "Red Hat System Administrator"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/systems-engineer/"
  },
  {
    "id": "project-manager", "title": "Project Manager", "sector": "it-services", "stage": "senior",
    "aka": ["IT Project Manager", "Project Management Specialist"],
    "summary": "Delivers IT projects on time, on budget and to specification.",
    "next": ["it-operations-manager"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in Business IT, IS or related field" },
      { "bdqf": 5, "years": null, "note": "BDQF 5 + project management certification and a few years' experience" }
    ],
    "skills": [["IT Project Management", "4"], ["Business Analysis", "4"], ["Business Risk Management", "4"], ["Contract Management", "4"], ["Procurement", "4"]],
    "soft": "Advanced",
    "certs": ["PMP", "PRINCE2", "APM PMQ", "Agile Project Management", "PMI-RMP", "PgMP"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/project-manager/"
  },
  {
    "id": "it-operations-manager", "title": "IT Operations Manager", "sector": "it-services", "stage": "senior",
    "aka": ["Director of IT Operations", "Senior IT Operations Manager", "DevOps Manager"],
    "summary": "Owns IT service delivery, SLAs, DevOps and disaster recovery.",
    "next": ["cio"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Business Continuity", "4"], ["Disaster Recovery Management", "4"], ["Database Administration", "4"], ["Service Level Management", "4"], ["Application Integration", "4"]],
    "soft": "Advanced",
    "certs": ["ITIL Foundation", "PMP", "CISA", "Certified ScrumMaster", "AWS SysOps Administrator", "Azure Administrator Associate"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/it-operations-manager/"
  },
  {
    "id": "cio", "title": "Chief Information Officer (CIO)", "sector": "it-services", "stage": "top",
    "aka": ["CIO", "Head of IT", "Director of IT", "VP of IT"],
    "summary": "Sets and drives the organisation's IT and digital strategy.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 + certification, 10 years at senior level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["IT Strategy", "5"], ["IT Governance", "5"], ["Enterprise Architecture", "5"], ["Cyber Risk Management", "5"], ["Stakeholder Management", "5"]],
    "soft": "Advanced",
    "certs": ["Certified CIO Programme", "CGEIT", "CRISC", "CISM", "CISSP"],
    "url": "https://www.biicf.bn/sub-sectors/it-services/job-roles/chief-information-officer/"
  },

  {
    "id": "network-technician", "title": "Network Technician", "sector": "telecom-network", "stage": "entry",
    "aka": ["Telecommunication Technician", "Communication Technician", "Cabling Technician"],
    "summary": "Installs, cables, configures and troubleshoots voice and data networks.",
    "next": ["network-team-lead"],
    "routes": [
      { "bdqf": 4, "years": 0, "note": "BDQF 4 in IT or Telecommunications" },
      { "bdqf": 3, "years": 0, "note": "BDQF 3 + relevant industry certification" }
    ],
    "skills": [["Network Administration & Maintenance", "3"], ["Networks Configurations", "3"], ["Infrastructure Support", "3"], ["Telecom Network Management", "3"], ["Fault Management", "2"]],
    "soft": "Intermediate",
    "certs": ["Cisco CCNA", "Cisco CCENT", "BICSI Technician", "Data Cabling Installer", "Cisco Optical Specialist"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/network-technician/"
  },
  {
    "id": "network-team-lead", "title": "Network Team Lead", "sector": "telecom-network", "stage": "mid",
    "aka": ["Network Coordinator", "Network Controller", "Network Consultant"],
    "summary": "Leads the network operations team, restores faults and runs 24/7 support.",
    "next": ["network-engineer", "infrastructure-engineer"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IS or Computer Science" },
      { "bdqf": 5, "years": null, "note": "BDQF 5 + industry experience or portfolio" }
    ],
    "skills": [["Networks Configurations", "4"], ["Fault Management", "4"], ["Network Security Management", "4"], ["Telecom Network Management", "4"], ["Emerging Technology Synthesis", "4"]],
    "soft": "Advanced",
    "certs": ["Cisco CCNP", "Cisco CCIE", "Huawei HCNA / HCNE", "Juniper JNCIE-ENT", "Wireshark WCNA", "Certified Fibre Optic Technician"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/network-team-lead/"
  },
  {
    "id": "network-engineer", "title": "Network Engineer", "sector": "telecom-network", "stage": "mid",
    "aka": ["Network Administrator", "Network Analyst", "Wireless Network Engineer", "Core Network Engineer"],
    "summary": "Designs LAN/WAN/wireless networks, tunes performance and secures them.",
    "next": ["infrastructure-manager"],
    "routes": [
      { "bdqf": 5, "years": 0, "note": "Specialist — BDQF 5 in IT or Telecommunications" },
      { "bdqf": 5, "years": 3, "note": "Expert / Management — BDQF 5 + 3 years" }
    ],
    "skills": [["Infrastructure Management", "4→5"], ["Telecom Network Management", "4→5"], ["Network Security Management", "4"], ["Business Analysis", "3→5"], ["Business Risk Management", "2→5"]],
    "soft": "Advanced → Expert",
    "certs": ["Cisco CCNA → CCNP → CCIE", "Juniper JNCIE-ENT", "Huawei HCNA", "ITIL", "AWS Advanced Networking"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/network-engineer/"
  },
  {
    "id": "infrastructure-engineer", "title": "Infrastructure Engineer", "sector": "telecom-network", "stage": "senior",
    "aka": ["Cloud Infrastructure Engineer", "Site Engineer", "Wireless Engineer", "Access Networks Engineer"],
    "summary": "Runs data centres and server, cloud and on-premises infrastructure.",
    "next": ["infrastructure-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Cloud Computing", "4"], ["Disaster Recovery Management", "4"], ["Enterprise Architecture", "4"], ["Infrastructure Strategy", "4"], ["Service Level Management", "4"]],
    "soft": "Intermediate → Advanced",
    "certs": ["Huawei HCIA (Datacom, WLAN, 5G)", "CWNP", "AWS Solutions Architect – Professional", "Azure Administrator Associate", "VMware VCP-DCV"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/infrastructure-engineer/"
  },
  {
    "id": "infrastructure-manager", "title": "Infrastructure Manager", "sector": "telecom-network", "stage": "senior",
    "aka": ["IT Infrastructure Manager", "Information Systems Manager", "Field Manager"],
    "summary": "Sets infrastructure strategy, governance, vendors and team direction.",
    "next": ["cto-telecom"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Infrastructure Strategy", "5"], ["Enterprise Architecture", "5"], ["IT Governance", "5"], ["Cloud Computing", "5"], ["Security Architecture", "5"]],
    "soft": "Advanced",
    "certs": ["PMP", "Telecommunications Management Professional (TMP)", "Certified Telecommunications Analyst (CTA)", "AWS Solutions Architect – Professional", "Huawei HCIA"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/infrastructure-manager/"
  },
  {
    "id": "cto-telecom", "title": "Chief Technology Officer (Network)", "sector": "telecom-network", "stage": "top",
    "aka": ["CTO", "Director of Technology", "VP of Technology", "Chief Digital Officer"],
    "summary": "Leads the organisation's technology and telecommunications strategy.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 + certification, 10 years at managerial level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["IT Strategy", "5"], ["Enterprise Architecture", "5"], ["Solution Architecture", "5"], ["Change Management", "5"], ["Business Agility", "5"]],
    "soft": "Advanced",
    "certs": ["CTO Certification Programme", "CITP", "CGEIT", "TOGAF 9", "5G Infrastructure and Operations", "ISO 22301"],
    "url": "https://www.biicf.bn/sub-sectors/telecommunications-and-network/job-roles/chief-technology-officer/"
  },

  {
    "id": "junior-programmer", "title": "Junior Programmer", "sector": "apps-solutions", "stage": "entry",
    "aka": ["Software Developer", "Software Engineer", "Coder", "Programmer Analyst", "Web Developer"],
    "summary": "Writes code to specification and supports senior developers.",
    "next": ["applications-developer", "solutions-architect"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IS, CS or Software Engineering + certification" },
      { "bdqf": 5, "years": 0, "note": "BDQF 5 + industry certification or a portfolio" }
    ],
    "skills": [["Application Development", "3"], ["Agile Software Development", "3"], ["Software Testing", "3"], ["User Interface Design", "3"], ["Data Design", "3"]],
    "soft": "Intermediate",
    "certs": ["HTML, CSS & JavaScript for Web Developers", "Oracle Certified Associate, Java", "AWS Certified Developer – Associate", "Google Cloud Professional Developer", "CompTIA Security+", "Certified ScrumMaster"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/junior-programmer/"
  },
  {
    "id": "applications-developer", "title": "Applications Developer", "sector": "apps-solutions", "stage": "mid",
    "aka": ["App Developer", "Mobile Developer", "Web Developer", "Software Programmer", "Full Stack Developer"],
    "summary": "Builds, tests and maintains web/mobile applications and databases.",
    "next": ["application-system-engineer"],
    "routes": [
      { "bdqf": 6, "years": 3, "note": "BDQF 6 in IS or CS" },
      { "bdqf": 5, "years": 5, "note": "BDQF 5 + industry experience, or a relevant portfolio" }
    ],
    "skills": [["Application Development", "3→4"], ["User Interface Design", "3→4"], ["Application Integration", "3"], ["Software Design", "3"], ["Security Architecture", "2→3"]],
    "soft": "Intermediate → Advanced",
    "certs": ["Associate Android Developer", "Flutter Mobile App Development", ".NET Core / ASP.NET Core MVC", "Node.js", "Scrum Developer", "Languages: JavaScript, Python, Java, SQL, C#, PHP"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/applications-developer/"
  },
  {
    "id": "solutions-architect", "title": "Solutions Architect", "sector": "apps-solutions", "stage": "mid",
    "aka": ["Technical Architect", "Application Architect", "IT Architect", "Cloud Architect"],
    "summary": "Designs solution architecture and technology roadmaps.",
    "next": ["software-architect"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in CS, IT or Software Engineering" },
      { "bdqf": 5, "years": 6, "note": "BDQF 5 + 6 years' relevant experience" }
    ],
    "skills": [["Software Design", "5"], ["Application Development", "4"], ["IT Architecture", "4"], ["Security Architecture", "4"], ["Quality Standards", "4"]],
    "soft": "Advanced",
    "certs": ["AWS Solutions Architect – Associate / Professional", "Azure Solutions Architect", "Google Cloud Architect", "TOGAF", "CISSP"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/solutions-architect/"
  },
  {
    "id": "application-system-engineer", "title": "Application System Engineer", "sector": "apps-solutions", "stage": "senior",
    "aka": ["IT Systems Engineer", "Enterprise Systems Engineer", "Server Engineer", "Information Systems Engineer"],
    "summary": "Installs and maintains systems, automation, backups and disaster recovery.",
    "next": ["software-development-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["System Integration", "4"], ["IT Project Management", "4"], ["Vendor Management", "4"], ["Service Management", "4"], ["Cloud Computing", "3"]],
    "soft": "Intermediate",
    "certs": ["ITIL 4 Foundation", "PMP", "CSEP", "CISSP", "CompTIA Security+", "Cisco CCNA"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/application-system-engineer/"
  },
  {
    "id": "software-architect", "title": "Software Architect", "sector": "apps-solutions", "stage": "senior",
    "aka": ["Cloud Architecture Specialist", "Technical Architect", "Application Architect"],
    "summary": "Sets technical standards, makes high-level design decisions, mentors devs.",
    "next": ["software-development-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Solution Architecture", "4"], ["Data Design", "4"], ["Infrastructure Design", "4"], ["Security Architecture", "4"], ["Embedded System Interface", "4"]],
    "soft": "Advanced",
    "certs": ["iSAQB CPSA", "TOGAF", "AWS Solutions Architect", "Azure Solutions Architect Expert", "Certified Kubernetes Application Developer (CKAD)"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/software-architect/"
  },
  {
    "id": "software-development-manager", "title": "Software Development Manager", "sector": "apps-solutions", "stage": "senior",
    "aka": ["Engineering Manager", "Application Development Manager", "Software Engineering Manager"],
    "summary": "Leads the development team across the whole software lifecycle.",
    "next": ["cto-apps"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 + industry certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Application Development", "4"], ["Software Design", "4"], ["Software Testing", "4"], ["Solution Architecture", "4"], ["Project Management", "4"]],
    "soft": "Advanced",
    "certs": ["Certified ScrumMaster", "Certified Scrum Product Owner", "PMP", "CSSLP", "AWS DevOps Engineer – Professional"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/software-development-manager/"
  },
  {
    "id": "cto-apps", "title": "Chief Technology Officer (Software)", "sector": "apps-solutions", "stage": "top",
    "aka": ["CTO", "VP of Technology", "Chief Digital Officer", "Chief Innovation Officer"],
    "summary": "Leads technology strategy, DevSecOps, cloud and IT governance.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 + certification, 10 years at senior level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["IT Strategy", "5"], ["Enterprise Architecture", "5"], ["System Integration", "5"], ["Partnership Management", "5"], ["Quality Standards", "5"]],
    "soft": "Advanced",
    "certs": ["CITP", "ITIL 4 Strategic Leader", "AWS Solutions Architect – Professional", "CGEIT", "TOGAF 9", "CISSP"],
    "url": "https://www.biicf.bn/sub-sectors/applications-and-solutions-development/job-roles/chief-technology-officer/"
  },

  {
    "id": "associate-security-analyst", "title": "Associate Security Analyst", "sector": "ict-security", "stage": "entry",
    "aka": ["Security Analyst", "SOC Analyst", "Ethical Hacker", "Hacker", "Information Security Officer", "Cyber Security"],
    "summary": "Monitors security systems, responds to alerts and educates users.",
    "next": ["cyber-risk-analyst"],
    "routes": [
      { "bdqf": 5, "years": 0, "note": "BDQF 5 in IS or Computer Science" },
      { "bdqf": 4, "years": 5, "note": "BDQF 4 + 5 years' experience, or a relevant portfolio" }
    ],
    "skills": [["Cyber Risk Management", "3"], ["Cyber & Data Breach Incident Management", "3"], ["Network Security Management", "3"], ["Security Administration", "3"], ["Security Governance", "3"]],
    "soft": "Intermediate → Advanced",
    "certs": ["CompTIA Security+", "Certified Ethical Hacker (CEH)", "GIAC GSEC", "SSCP", "GIAC GCIH", "OSCP"],
    "url": "https://www.biicf.bn/sub-sectors/ict-security/job-roles/associate-security-analyst/"
  },
  {
    "id": "cyber-risk-analyst", "title": "Cyber Risk Analyst", "sector": "ict-security", "stage": "mid",
    "aka": ["IT Risk Analyst", "Threat Analyst", "Risk Assessment Analyst"],
    "summary": "Assesses cyber risks and recommends controls to reduce them.",
    "next": ["security-engineer"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IS or Computer Science" },
      { "bdqf": 5, "years": 4, "note": "BDQF 5 + 4 years in relevant roles" }
    ],
    "skills": [["Cyber Risk Management", "4"], ["Security Architecture", "4"], ["Security Governance", "4"], ["Security Implementation", "4"], ["Security Planning", "4"]],
    "soft": "Advanced",
    "certs": ["CompTIA CySA+", "CompTIA CASP+", "CISSP", "CISA", "CISM", "ISO 27001"],
    "url": "https://www.biicf.bn/sub-sectors/ict-security/job-roles/cyber-risk-analyst/"
  },
  {
    "id": "security-engineer", "title": "Security Engineer", "sector": "ict-security", "stage": "senior",
    "aka": ["Cyber Security Engineer", "Information Security Engineer", "IT Security Engineer"],
    "summary": "Designs and implements secure system architectures.",
    "next": ["cyber-risk-manager"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in Cyber Security, IT Security or CS" },
      { "bdqf": 5, "years": 4, "note": "BDQF 5 + 4–6 years' experience" },
      { "bdqf": 4, "years": 6, "note": "BDQF 4 + 6–8 years as a security analyst or similar" }
    ],
    "skills": [["Security Architecture", "5"], ["Network Security Management", "5"], ["Infrastructure Design", "5"], ["Cyber Risk Management", "4"], ["Security Programme Management", "4"]],
    "soft": "Advanced",
    "certs": ["CISSP", "CEH", "CISM", "Cisco CCNP Security", "OSCP", "Cisco CyberOps"],
    "url": "https://www.biicf.bn/sub-sectors/ict-security/job-roles/security-engineer/"
  },
  {
    "id": "cyber-risk-manager", "title": "Cyber Risk Manager", "sector": "ict-security", "stage": "senior",
    "aka": ["IT Security Manager", "GRC Manager", "Information Security Manager", "Cyber Assurance Manager"],
    "summary": "Owns security policy, governance, compliance and awareness programmes.",
    "next": ["ciso"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 in Cybersecurity or CS + certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Audit and Compliance", "4"], ["Cyber Forensics", "4"], ["IT Governance", "4"], ["Security Education and Awareness", "4"], ["Security Programme Management", "4"]],
    "soft": "Intermediate",
    "certs": ["CRISC", "CISA", "ISO 27005 Risk Manager", "ISC2 CGRC", "CompTIA CySA+", "CGEIT"],
    "url": "https://www.biicf.bn/sub-sectors/ict-security/job-roles/cyber-risk-manager/"
  },
  {
    "id": "ciso", "title": "Chief Information Security Officer (CISO)", "sector": "ict-security", "stage": "top",
    "aka": ["CISO", "Head of IT Security", "Chief Security Officer", "Director of Cybersecurity"],
    "summary": "Leads the organisation's whole information security strategy.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 + certification, 10 years at senior level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["Security Strategy", "5"], ["Threat Analysis and Defence", "5"], ["Threat Intelligence and Detection", "5"], ["Cyber Forensics", "5"], ["Business Continuity", "5"]],
    "soft": "Advanced",
    "certs": ["CCISO", "CISSP", "CISM", "CRISC", "GIAC GSTRT", "NIST CSF 2.0 Lead Implementer"],
    "url": "https://www.biicf.bn/sub-sectors/ict-security/job-roles/chief-information-security-officer-ciso/"
  },

  {
    "id": "market-analyst", "title": "Market Analyst", "sector": "digital-media", "stage": "entry",
    "aka": ["Marketing Assistant", "Marketing Associate", "Marketing Coordinator", "Marketing Analyst"],
    "summary": "Analyses campaign data, traffic, leads and conversions.",
    "next": ["digital-marketing-executive"],
    "routes": [
      { "bdqf": 5, "years": 5, "note": "BDQF 5 in Marketing, Communications or Economics" },
      { "bdqf": 4, "years": 3, "note": "BDQF 4 in Marketing, Communications or Economics" }
    ],
    "skills": [["Market Research", "4"], ["Customer Behaviour Analysis", "4"], ["Data and Trend Analytics", "4"], ["Media & Platform Management", "4"], ["Budgeting", "4"]],
    "soft": "Advanced",
    "certs": ["Google Analytics", "Google Digital Garage", "Meta Blueprint", "HubSpot Inbound Marketing", "SEMrush SEO Toolkit"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/market-analyst/"
  },
  {
    "id": "digital-marketing-executive", "title": "Digital Marketing Executive", "sector": "digital-media", "stage": "mid",
    "aka": ["Social Media Specialist", "SEO Specialist", "Digital Marketer", "Content Creator", "Influencer Marketing"],
    "summary": "Runs digital campaigns, SEO/SEM, website content and social media.",
    "next": ["business-development-manager", "customer-experience-manager"],
    "routes": [
      { "bdqf": 5, "years": 5, "note": "BDQF 5 in Marketing, Communications or Economics" }
    ],
    "skills": [["Market Research", "4"], ["Media & Platform Management", "4"], ["Customer Intelligence Analysis", "4"], ["Data and Trend Analytics", "4"], ["Stakeholder Management", "4"]],
    "soft": "Advanced",
    "certs": ["Google Ads", "Google Analytics IQ", "Meta Certified Digital Marketing Associate", "HubSpot Content Marketing", "DMI Digital Marketing Pro"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/digital-marketing-executive/"
  },
  {
    "id": "business-development-manager", "title": "Business Development Manager", "sector": "digital-media", "stage": "senior",
    "aka": ["Sales Manager", "Client Acquisition Manager", "Business Acquisition Manager"],
    "summary": "Finds new business, manages the CRM pipeline and closes deals.",
    "next": ["marketing-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 in Marketing/Business/Creative Multimedia — or IS/CS + marketing certification or portfolio" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Business Development", "4"], ["Sales Strategy", "4"], ["Business Negotiation", "4"], ["Partnership Management", "4"], ["Customer Experience Management", "4"]],
    "soft": "Advanced",
    "certs": ["Certified Business Development Manager (CBDM)", "Certified Digital Marketing Professional (CDMP)", "Certified Sales Executive", "Salesforce Sales Cloud Consultant", "Zoho CRM Academy"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/business-development-manager/"
  },
  {
    "id": "customer-experience-manager", "title": "Customer Experience Manager", "sector": "digital-media", "stage": "senior",
    "aka": ["CX Manager", "Head of Customer Success", "Customer Experience Lead"],
    "summary": "Designs the customer journey, onboarding and retention programmes.",
    "next": ["marketing-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 in Marketing/Business/Creative Multimedia — or IS/CS + marketing certification or portfolio" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Customer Experience Management", "4"], ["Account Management", "4"], ["Product Management", "4"], ["Data Analytics", "4"], ["Business Performance Management", "4"]],
    "soft": "Advanced",
    "certs": ["CCXP", "Certified Customer Success Manager", "Salesforce Service Cloud", "Adobe Experience Manager", "Qualtrics"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/customer-experience-manager/"
  },
  {
    "id": "marketing-manager", "title": "Marketing Manager", "sector": "digital-media", "stage": "senior",
    "aka": ["Digital Marketing Manager", "Brand Manager", "Marketing Strategist", "Advertising Manager"],
    "summary": "Plans integrated marketing campaigns, including AI-powered tools.",
    "next": ["cmo"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 in Marketing/Business/Creative Multimedia — or IS/CS + marketing certification or portfolio" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 + certification or portfolio" }
    ],
    "skills": [["Marketing Strategy", "3"], ["Integrated Marketing", "3"], ["Marketing Campaign Management", "3"], ["Brand Management", "3"], ["Digital Advertising Platforms", "3"]],
    "soft": "Advanced",
    "certs": ["AMA Professional Certified Marketer", "CMMP", "Google Ads", "TikTok Academy", "Google Digital Marketing & E-commerce Certificate"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/marketing-manager/"
  },
  {
    "id": "cmo", "title": "Chief Marketing Officer (CMO)", "sector": "digital-media", "stage": "top",
    "aka": ["CMO", "Head of Marketing", "Marketing Director"],
    "summary": "Leads brand, marketing technology and crisis communications.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 + certification, 10 years at senior level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["Marketing Strategy", "5"], ["Digital Analytics", "5"], ["Digital Marketing Tools", "5"], ["Business Development", "5"], ["Customer Experience Management", "5"]],
    "soft": "Advanced",
    "certs": ["CMMP", "Chartered Marketer", "Certified CMO (CCMO)", "MBA Marketing", "Certified Agile Marketing Specialist"],
    "url": "https://www.biicf.bn/sub-sectors/digital-media/job-roles/chief-marketing-officer/"
  },

  {
    "id": "data-entry", "title": "Data Entry", "sector": "data-ai", "stage": "entry",
    "aka": ["Data Entry Clerk", "Data Entry Operator", "Data Processor"],
    "summary": "Enters, checks and backs up data accurately.",
    "next": ["data-analyst"],
    "routes": [
      { "bdqf": 4, "years": 0, "note": "BDQF 4 in Data Analytics, IT or IS" }
    ],
    "skills": [["Data Analytics", "2"], ["Data Ethics", "2"], ["Data Governance", "2"], ["Database Administration", "2"], ["Data Migration", "2"]],
    "soft": "Basic",
    "certs": ["Microsoft Excel", "Google Data Analytics", "Power BI", "Power Apps", "Basic Coding"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-entry/"
  },
  {
    "id": "data-analyst", "title": "Data Analyst", "sector": "data-ai", "stage": "entry",
    "aka": ["Business Intelligence Analyst", "BI Analyst", "Data Modeler", "Business Analyst"],
    "summary": "Cleans, analyses and visualises data; builds reports and dashboards.",
    "next": ["data-engineer", "ai-engineer"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in IS or Computer Science" },
      { "bdqf": 5, "years": null, "note": "BDQF 5 + industry experience, or a relevant portfolio" }
    ],
    "skills": [["Data Analytics", "3→4"], ["Data Visualisation", "3→4"], ["Data Cleansing", "3→4"], ["Data Engineering", "3→4"], ["Database Administration", "3→4"]],
    "soft": "Intermediate → Advanced",
    "certs": ["Microsoft Certified: Data Analyst Associate (Power BI)", "Tableau", "IBM Data Science Professional Certificate", "Google Professional Data Engineer", "SAS Certified Data Scientist"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-analyst/"
  },
  {
    "id": "data-engineer", "title": "Data Engineer", "sector": "data-ai", "stage": "mid",
    "aka": ["Big Data Engineer", "ETL Developer", "BI Engineer", "Machine Learning Engineer"],
    "summary": "Builds data pipelines (ETL), data stores and platforms; deploys ML models.",
    "next": ["data-architect"],
    "routes": [
      { "bdqf": 6, "years": 0, "note": "BDQF 6 in CS, IS or Software Engineering" },
      { "bdqf": 5, "years": 5, "note": "BDQF 5 + certification" }
    ],
    "skills": [["Data Engineering", "3"], ["Data Design", "3→4"], ["Data Governance", "3→4"], ["Computational Modelling", "3"], ["Emerging Technology Synthesis", "3→4"]],
    "soft": "Intermediate → Advanced",
    "certs": ["Google Professional Data Engineer", "Azure Data Engineer Associate", "AWS Data Analytics – Specialty", "Cloudera CCP Data Engineer", "TensorFlow Developer Certificate"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-engineer/"
  },
  {
    "id": "ai-engineer", "title": "Artificial Intelligence Engineer", "sector": "data-ai", "stage": "mid",
    "aka": ["AI Engineer", "Machine Learning Engineer", "ML Engineer", "AI Specialist", "AI Manager"],
    "summary": "Builds, tests and deploys ML, NLP and AI systems.",
    "next": ["data-manager"],
    "routes": [
      { "bdqf": 6, "years": 5, "note": "BDQF 6 in AI or Computer Science + certification" },
      { "bdqf": 5, "years": 8, "note": "BDQF 5 in AI, CS or IS + certification or portfolio" }
    ],
    "skills": [["Computational Modelling", "4"], ["Computer Vision Technology", "4"], ["Intelligent Reasoning", "4"], ["Pattern Recognition Systems", "4"], ["Data Strategy", "4"]],
    "soft": "Advanced",
    "certs": ["Google Professional Data Engineer", "AWS Data Analytics – Specialty", "IBM Certified Data Architect – Big Data", "DASCA Big Data Engineer", "Cloud Architect"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/artificial-intelligence-engineer/"
  },
  {
    "id": "data-architect", "title": "Data Architect", "sector": "data-ai", "stage": "senior",
    "aka": ["Data Warehouse Architect", "Enterprise Data Architect"],
    "summary": "Designs the organisation's data architecture.",
    "next": ["bi-director"],
    "routes": [],
    "skills": [],
    "soft": "",
    "certs": [],
    "unavailable": true,
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-architect/"
  },
  {
    "id": "data-manager", "title": "Data Manager", "sector": "data-ai", "stage": "senior",
    "aka": ["Data Management Specialist", "Data Management Lead", "Data Management Consultant"],
    "summary": "Leads data collection, research and market/customer insight reports.",
    "next": ["bi-director"],
    "routes": [
      { "bdqf": 6, "years": 3, "note": "BDQF 6 in IS, CS, Statistics, Maths or Actuarial Science — 3 years as a Data Analyst or similar" },
      { "bdqf": 5, "years": 3, "note": "BDQF 5 in the same fields + industry experience or portfolio — 3 years as a Data Analyst or similar" }
    ],
    "skills": [["Data and Trend Analytics", "4"], ["Customer Intelligence Analysis", "4"], ["Market Research", "4"], ["Quality Standards", "4"], ["Service Level Management", "4"]],
    "soft": "Advanced",
    "certs": ["DAMA CDMP", "Data Governance and Stewardship Professional (DGSP)", "Informatica MDM", "Power BI", "GDPR Compliance"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-manager/"
  },
  {
    "id": "bi-director", "title": "Business Intelligence Director", "sector": "data-ai", "stage": "top",
    "aka": ["BI Director", "Head of Analytics", "Chief Business Intelligence Officer", "VP of Business Intelligence"],
    "summary": "Sets BI strategy, data governance and decision dashboards.",
    "next": ["data-scientist"],
    "routes": [
      { "bdqf": 6, "years": 10, "note": "BDQF 6 in Business IS or IT + certification, 10 years at senior level" },
      { "bdqf": 5, "years": 12, "note": "BDQF 5 + certification, 12 years at senior level" }
    ],
    "skills": [["Data Analytics", "5"], ["Data Governance", "5"], ["Data Visualisation", "5"], ["Data Warehouse", "5"], ["Design Thinking", "5"]],
    "soft": "Advanced",
    "certs": ["TDWI CBIP", "Google Business Intelligence Certificate", "Microsoft Power BI Data Analyst", "Tableau Certified Data Analyst", "Qlik Sense Business Analyst"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/business-intelligence-director/"
  },
  {
    "id": "data-scientist", "title": "Data Scientist", "sector": "data-ai", "stage": "top",
    "aka": ["AI Scientist", "Machine Learning Scientist", "Data Mining Engineer"],
    "summary": "Creates advanced models and ML/AI research with business impact.",
    "next": [],
    "routes": [
      { "bdqf": 6, "years": 6, "note": "BDQF 6 in IT, CS, Maths, Statistics or Software Engineering" },
      { "bdqf": 5, "years": 10, "note": "BDQF 5 + certification, 10 years in data science" }
    ],
    "skills": [["Business Innovation", "5"], ["Machine Learning", "4"], ["Data Modelling and Design", "4"], ["Pattern Recognition", "4"], ["Intelligent Reasoning", "4"]],
    "soft": "Advanced",
    "certs": ["Statistics", "Python / R", "SQL & NoSQL", "Machine & Deep Learning", "Big Data (Hadoop, Spark)", "Model Deployment"],
    "url": "https://www.biicf.bn/sub-sectors/data-and-artificial-intelligence/job-roles/data-scientist/"
  }
]
```

---

## 8. "Viral" growth checklist
- [ ] **Deep links** for every result (`?goal=&from=`), so a shared link opens straight to that roadmap.
- [ ] **Share card** in Instagram portrait size, with a QR code on the image.
- [ ] **Open Graph image** per sector (6 static PNGs), so links look good in WhatsApp previews.
- [ ] **Challenge copy** on the result: "Tag a friend who'd make a great {role} 👇"
- [ ] **Quiz result share:** "I got 🛡️ Cyber Security — what's yours?"
- [ ] **Compare mode:** "CISO vs CTO — which road is longer?"
- [ ] **Teacher mode:** `?mode=present` hides the navigation and enlarges the roadmap for classroom projectors.

---

## 9. Accessibility checklist
- [ ] Full keyboard navigation; visible focus ring (2px yellow outline with a navy offset)
- [ ] Search uses the ARIA combobox pattern; results are announced to screen readers
- [ ] Roadmap is an ordered list (`<ol>`) underneath the SVG decoration
- [ ] Status badges use icon **and** text, never colour alone
- [ ] Tap targets are at least 44×44px
- [ ] `prefers-reduced-motion` and `prefers-color-scheme` are respected (optional dark theme: navy background, yellow accents)

---

## 10. Definition of done
1. All 39 roles are searchable by title and nickname.
2. The test cases in §6.4 produce the expected paths and numbers.
3. A shared link reopens the identical roadmap.
4. The share image downloads correctly on iOS Safari and Android Chrome.
5. Lighthouse scores are 90+ for Performance, Accessibility, Best Practices and SEO.
6. The footer shows the unofficial disclaimer and a link to biicf.bn.
7. Data Architect shows "Details coming soon" with a link to the official page.
