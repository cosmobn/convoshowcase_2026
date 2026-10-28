# COSMO Career Pathways

A responsive career pathway explorer in COSMO blue and yellow. Students start with “What do you want to be?”, choose a field, answer seven “What do you like?” questions, see a pie chart of their answers with the jobs that suit them, meet the chosen career's illustrated future character, and press “Accept mission” to enter the pathway. A connected character journey visualises the stages toward that goal, with the real qualifications, skills, certifications and experience behind each role. Qualification pills, an experience slider, sector tabs, bookmarks, a course catalogue and shareable goals are included. Built with plain HTML, CSS and JavaScript; no runtime dependencies or account required.

Live website: https://abi437.github.io/cosmo-career-pathways/

Public source repository: https://github.com/abi437/cosmo-career-pathways

## Student flow

1. **Start:** “What do you want to be?” introduces the journey.
2. **Field:** choose CM (Creative Media), IT, Business or OHS (Occupational Health & Safety). Unsure students can take a five-question field quiz that suggests a field and shows their answers as a pie chart.
3. **Likes:** seven “What do you like?” questions written for that field. Each answer points to one job area, such as Cyber Security or Data & AI; every question also offers **None of these**.
4. **Match:** a pie chart of the answers, the jobs in the best-matching area(s), then the rest of the field. If four or more answers were “None of these”, the student is asked whether the field fits, and can take the field quiz or see the jobs anyway.
5. **Career:** for IT and CM, the character select with the best-matching roles first and tagged **Best match**. Business and OHS open their COSMO course-based guides instead, with best-matching careers marked.
6. **Your future:** the role's entry routes, the closest COSMO qualification, skills and certifications, then **Accept mission** to confirm.
7. **Journey:** explore the career stages and adjust qualification and experience to understand the next requirements. Role details list every linked COSMO course.

Back controls and browser Back/Forward preserve the selection flow, including each answer. **Change career** returns to career selection without clearing qualification or experience settings. Existing shared `?goal=...` links open the journey directly; ordinary visits start at the opening question. The URL records the active screen, selection and answers (`likes`, `quiz`, `anyway`).

The questions, job areas and scoring live in [`career-quiz.js`](career-quiz.js), shared with the simple [`prototype/`](prototype/). [`pie-chart.js`](pie-chart.js) draws the answers chart; its colours were checked for colour-blind separation on the dark glass panels, and the legend always shows names and percentages.

IT groups the source's software, cyber security, network, data/AI and IT services sectors (33 roles). CM maps to Digital Media (six roles checked against the official BIICF website on 27 October 2026). Business opens a separate COSMO-based guide with the published BTEC Levels 1, 2, 3 and 5 study progression, potential careers and HND leadership topics. OHS opens a COSMO guide built around the City and Guilds Level 3 NVQ in Occupational Health and Safety; its ten job titles are general examples because the data has no OHS roles. Both guides are clearly labelled as course-based information rather than BIICF career ladders.

Each field card has a smiling career portrait based on the supplied reference photo: IT with a laptop, CM with a drawing tablet and stylus, and Business in a suit with a portfolio. OHS has no portrait yet and shows the illustrated character until one is added. The matching Creative and Business portraits also appear beside their availability notices. The same smiling man now appears at all six character levels, in the welcome scene, career list, future profile, goal preview and journey cards. These are illustrative career outfits; role data and journey requirements are unchanged.

Original transparent smiling portraits and their individual generation prompts are saved as `assets/field-{it,creative,business}-smiling.png` and `assets/field-{it,creative,business}-smiling-prompt.md`. They were made with the built-in image generator. Lightweight 720-pixel-wide WebP copies are served through `<picture>`, with PNG fallbacks. Earlier portrait files remain available as source history.

## Run

Open `http://localhost/career%20pathway/` through WAMP, or run:

```sh
npm start
```

Then open `http://127.0.0.1:8080/`. Use an HTTP server; browser module/data loading is not supported through `file://`.

## Data availability

Source: https://ccctmacademy.edu.bn/showcase_2026/openapi.json

The supplied specification describes 39 roles, six sectors and 38 courses. Its four `/showcase_2026/data/*.json` endpoints returned HTTP 404 on 16 October 2026. This build uses the complete 39-role / 38-course snapshot bundled in [`backup/data/`](backup/data/), with the six Digital Media roles replaced by the [BIICF Digital Media pathway](https://www.biicf.bn/sub-sectors/digital-media/) checked on 27 October 2026, plus all six sector definitions and all 39 role-course mappings. The merged data passes the same checks as `npm run refresh:data` (every documented ID present, valid progression and course links). A separate [`data/business-leadership.json`](data/business-leadership.json) resource records the official [COSMO Business](https://cosmo.edu.bn/business/) study guide without inventing role progression or competency requirements.

The roadmap engine follows the specification's directed role graph and BDQF/experience rules. Experience is cumulative, not added across steps. Subject, certification and portfolio conditions still apply. Estimated BDQF levels are identified, and unavailable role details are handled explicitly.

When the source datasets become available, run:

```sh
npm run refresh:data
npm test
npm run build
```

The refresh command downloads and validates all four files before replacing the local snapshot. An unsuccessful download retains the existing data. `data/metadata.json` records provenance and snapshot mode.

## Validation and deployment

```sh
npm test
npm run build
```

`dist/` contains the complete static website. Local browser checks can be run with the dev server active using `node scripts/browser-check.mjs` on Windows with Chrome installed at its standard location. This checks actual page interactions and saves desktop/mobile screenshots under `artifacts/`.

Roadmap links use `?goal=ciso&from=hnd&exp=4`. Qualification choices and bookmarks stay in the visitor's browser. Sites deployment identity and static output are configured in `.openai/hosting.json`.

## GitHub Pages

In the GitHub repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The included `.github/workflows/pages.yml` builds `dist/` and publishes it whenever changes are pushed to `main`. You can also run it manually from the **Actions** tab. No dependency installation is needed; the `devDependencies` are only for rebuilding `vendor/three.min.js`.

After the first successful deployment, find the live website link in **Settings → Pages** or the workflow's **github-pages** deployment. All website assets and data use relative paths so the site also works under a repository subpath.

## Motion and interactions

The main palette uses blue `#1E2859` and yellow `#FCD00F`, with navy text on yellow controls and light blue surfaces. The connected journey displays a starting character and each available career step, using a six-frame illustration that evolves with career stage. These visual stages are illustrative, not BDQF levels, earned achievements or guaranteed promotions. The goal preview shows a possible future; role requirements remain grounded in the supplied data.

The journey preview advances only after the visitor presses Play, ends at the final stage and stops when a stage is selected, the profile changes, a dialog opens, the tab is hidden or motion is disabled. Manual stage selection remains available with reduced motion. Finite horizontal card entrances, hover feedback, sliding detail panels and bookmark feedback add detail. Slider updates remain immediate and retain keyboard focus.

The top-bar motion control pauses animations and remembers the choice locally. System reduced-motion settings take precedence. Content stays visible and usable without motion. Horizontal pathways support native scrollbars, trackpads and keyboard navigation.

With the local server running, use `node scripts/motion-check.mjs` to check normal motion, pausing, reduced motion, input focus, dialogs and mobile layout in Chrome.

### 3D welcome scene and scroll effects

The welcome card has a WebGL scene ([`hero3d.js`](hero3d.js)): a starfield, drifting wireframe solids, and a glowing 3D path with a travelling light from "You, today" to "Your future self". The path is measured from the HTML portraits, so it meets their feet at every screen size. The headline, copy and characters enter with a staggered blur-in, and the eyebrow and feature chips use liquid-glass pills. Three.js loads only on the welcome screen, after first paint, from the trimmed bundle [`vendor/three.min.js`](vendor/three.min.js) (about 140 KB gzipped). If WebGL is unavailable, the original flat illustration remains. With motion paused or reduced, the scene shows one still frame.

On the journey page, [`scroll-motion.js`](scroll-motion.js) adds a yellow scroll-progress bar, hero parallax, blur-in section reveals, and a staggered rise of the career characters as the path between them draws in. Everything is visible at rest when motion is off.

`vendor/three.min.js` is committed, so deployment needs no installation. To rebuild it after changing the Three.js imports in [`scripts/three-entry.mjs`](scripts/three-entry.mjs), run `npm install` then `npm run vendor:three`.

## Promo video

[`promo/`](promo/) is a separate [Remotion](https://www.remotion.dev/) project that renders a 24-second promo from the site's own artwork: the opening question, the three fields, meeting your future self, the six-level journey, and an end card. It has two compositions: `Vertical` (1080 × 1920, for TikTok/Reels) and `Landscape` (1920 × 1080, for presentations).

```sh
cd promo
npm install
npm run render     # writes out/cosmo-promo-vertical.mp4 and out/cosmo-promo-landscape.mp4
npm run studio     # live preview and editing in the browser
```

The video has no audio, so a trending sound can be added in the TikTok editor. Rendered files in `promo/out/` are not committed.

Character artwork: [`assets/character-levels-smiling.png`](assets/character-levels-smiling.png), generated with the built-in image generator from the supplied man's likeness. The final prompt and provenance are documented in [`assets/character-levels-smiling-prompt.md`](assets/character-levels-smiling-prompt.md). The transparent 2172 × 724 image shows a smiling learner, trainee, analyst, specialist, manager and leader. Measured background positions keep each complete figure centred within its viewport despite the source's uneven spacing.

The browser loads [`assets/character-levels-smiling.webp`](assets/character-levels-smiling.webp), a lightweight delivery copy at the same dimensions. Set `PATHFINDER_CHROME_PROFILE` to a fresh profile directory when checking a new public deployment to avoid stale browser cache.
"# convoshowcase_2026" 
