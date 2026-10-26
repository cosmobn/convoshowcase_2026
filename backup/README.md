# PathFinder ICT

A mobile-first, shareable career-path finder for students in Brunei.
Pick a dream ICT job, say where you are now, and see the step-by-step road to get there.

It is an **unofficial** student guide based on the Brunei ICT Industry Competency Framework ([biicf.bn](https://www.biicf.bn)).
It has no backend, no login, no cookies and no tracking.

## Run it locally

The site fetches JSON and uses ES modules, so open it through a web server, not by double-clicking `index.html`.

```sh
npm start              # npx serve on http://localhost:8080
# or
python -m http.server 8080
```

## Test the path logic

```sh
npm test
```

This runs the must-pass cases from spec §6.4 plus a few extra checks (route toggle, Data Architect, experience slider).

## Deploy

Upload the folder as-is to GitHub Pages, Netlify or Vercel. There is no build step.

Shared roadmap links go through `r/<sector>/`. These are tiny redirect pages that give WhatsApp and Instagram link previews a per-sector image.
Once you know the live domain, regenerate them with absolute image URLs, which link-preview crawlers prefer:

```sh
node tools/make-share-pages.js https://your-domain.example/
```

To redraw the Open Graph images after changing `data/sectors.json` (Windows PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File tools/make-og-images.ps1
```

## API description

`openapi.json` is an OpenAPI 3.1 description of everything the site serves: the JSON data files, the deep-link URL parameters, the share redirect pages and the assets.

The data includes the COSMO courses from `cosmo-courses.md` and `cosmo-ccp.md`:
- `data/courses.json` holds every course with `careerLinks` to BIICF roles.
- `data/role-courses.json` answers "which courses lead to this role?".
- Qualification links follow the same entry-route rules as the roadmap. Short-course links are curated in `tools/make-courses.js`, each with a reason.
- BDQF levels for BTEC Levels 1–3 and City & Guilds are estimates and should be confirmed with COSMO.

Everything is generated, so regenerate after editing roles or courses:

```sh
npm run openapi                      # rebuilds course data, then openapi.json
npm test                             # path rules + course link checks
npx @redocly/cli lint openapi.json   # uses redocly.yaml
```

## Files

| Path | What it does |
|---|---|
| `index.html` | Single page. Sections are shown or hidden from the URL state. |
| `css/styles.css` | Design tokens, light and dark themes, layouts, motion. |
| `js/app.js` | Routing via URL params, search, all screens, explore and compare. |
| `js/path.js` | Path-finding and status rules (spec §6). Pure functions, unit-tested. |
| `js/share.js` | 1080×1350 share card on `<canvas>` with QR code, Web Share, copy link, toast, confetti. |
| `js/quiz.js` | The 5-question "Not sure?" quiz. |
| `data/roles.json`, `data/sectors.json` | All 39 roles and 6 sectors, copied verbatim from the build spec. |
| `assets/` | Open Graph images and self-hosted fonts (Inter, Plus Jakarta Sans; SIL Open Font License). |
| `r/<sector>/` | Share redirect pages with per-sector link previews. |
| `tests/path.test.js` | Spec §6.4 test cases. |

## URL parameters

| Param | Values |
|---|---|
| `goal` | role `id` from `roles.json` |
| `from` | `olevel`, `alevel`, `hnd`, `degree` or `working` |
| `exp` | years of experience (optional) |
| `w=1` | the user picked "Already working" |
| `r=1` | show the alternative route where the road splits |
| `view` | `explore` or `quiz` |
| `compare` | two role ids, e.g. `ciso,cto-apps` |
| `sector`, `stage` | filters on the explore page |
| `mode=present` | teacher mode: hides navigation and enlarges the roadmap |

## Decisions and deviations from the spec

- **Test case "ciso from degree".** The spec expects Cyber Risk Analyst as the first ✅ step. The §6.2 status rule also marks Associate Security Analyst ✅ for a degree holder, because its BDQF 5 route needs no experience. The app follows the §6.2 rule. A "Fast track" line under the header names the furthest step the user already qualifies for, which is Security Engineer here.
- **Unspecified experience.** Some routes say "industry experience or a portfolio" without a number (`years: null`). These count as met, as in the §6.2 code, but the badge reads "You qualify (with a portfolio)".
- **Route choice on ties.** When several routes need the same experience, the app prefers the one with an explicit number, then the higher BDQF level.
- **Fonts are self-hosted** instead of loaded from Google Fonts. This avoids sending visitors' IP addresses to a third party and speeds up the first paint.
- **Share card** is drawn directly on `<canvas>`, so `html-to-image` is not needed. The QR code library and confetti library load lazily from CDNs. Without them the card simply has no QR code and there is no confetti.
- **Analytics** are not included. The spec marks them optional.
