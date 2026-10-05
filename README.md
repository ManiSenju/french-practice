# French Practice

A React + TypeScript + Vite study app for the existing French vocabulary dataset.
It keeps the lavender card-stack design and adds a searchable vocabulary table,
flipping read/typing cards, and theme quizzes.

## Run locally

Use Node.js 22 (recommended; the current build also runs on Node 18.19).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The app needs an HTTP server; opening
`index.html` directly from Finder is not supported.

## Study features

- **Vocabulary:** all 4,354 entries, theme/CEFR/search filters, 30-row pages and
  expandable details. An Examples column links to bilingual source sentences;
  756 vocabulary entries have matched Anki examples, and missing coverage is
  labelled explicitly. The separate **Verbs** category contains 47 cards.
- **Read:** French and audio on the front; flip for the French word, audio,
  meaning, pronunciation hint, grammar, examples and available conjugations.
- **Typing:** English → French only, with French audio and a revealable back.
  Typed input survives flips. Missing accents are accepted with a spelling
  reminder; articles remain required when included in the source answer.
- **Theme quiz:** mixed French → English / English → French questions. All
  options come from the selected theme and current filters. Known overlapping
  translations and duplicate options are excluded; insufficient pools are skipped.
  This is a reference-based heuristic, not exhaustive semantic validation.
- **Verbs quiz:** selected-tense conjugation forms, including compound tenses.
  Defective/unavailable forms are excluded, and known valid alternatives are
  not offered as wrong answers.
- Sessions of up to 10/20/30 cards, unaided scores, streaks, and retry of mistakes
  or assisted answers. Flipping before answering (or playing French audio in an
  English → French question) counts as assistance.
- **Audio settings:** choose a French device/online voice, preview it, and select
  Normal or Slow playback. Preferences are saved locally and applied throughout
  the app. Voice availability and quality depend on your browser/device.
- Attempt history is saved locally on the device (last 5,000 attempts). No login or automatic cross-device sync is required.
  Sessions restore automatically, including typed input, flip state and results.
- **Needs practice:** mistakes and assisted answers enter a persistent review list;
  unaided correct answers remove them. You can also add/remove words in expanded
  details or on card backs. The review filter combines with theme/level/search.
- **Progress backup:** export a JSON file and import it on another device. Import
  validates the file and asks before replacing progress; it downloads a safety
  backup of current progress first. Keep that download before continuing.
- The production build caches the app and data after the first successful online
  visit. It can then reload offline. Audio uses available browser/device French
  voices; offline audio depends on whether that voice is installed locally.

## Build and check

```sh
npm test
npm run build
npm run preview
npm run test:e2e
```

The browser checks use installed Google Chrome. If Chrome is unavailable, install
it or change `channel` in `playwright.config.ts` and install a Playwright browser.
`test:e2e` tests the production build; run `npm run build` first.

The build exports compact, generated JSON into `public/data/` and then `dist/`.
These generated folders are ignored. Canonical JSON source files stay in `vocab/`. To rebuild the source dataset itself, follow `PROJECT_NOTES.md`.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds, tests, and publishes
`dist/` on pushes to `main` or a manual workflow run. Commit the app, lockfile,
workflow and source JSON files to your GitHub repository. In repository settings,
select **Pages → Build and deployment → Source: GitHub Actions**.

If your default branch is not `main`, update the workflow branch filter.
Relative asset/data URLs support both `username.github.io` and project paths
such as `username.github.io/french-practice/`; no routing rewrite is needed.
Deployment has been prepared, not published from this workspace.

## Example coverage

All 4,354 vocabulary entries and 47 verb cards have French–English examples,
including 3,623 previously missing entries. New examples target each word’s
listed level (estimated, not certified). Existing deck examples are preserved.
See [sources, attribution, and review limitations](public/EXAMPLE_SOURCES.md).
`vocabulary_examples.json` keeps examples stable across dataset and app rebuilds.

## Vocabulary files

All vocabulary datasets, examples, reference/repair files, word lists, PDFs, and
Anki decks live in `vocab/`. The primary dataset is `vocab/topic_vocab.json`;
verb cards are in `vocab/verbs_vocab.json`. Python tools live in `tools/` and read/write this folder. Run commands from the root as before.
The app build exports compact data to the generated `public/data/` folder.

## Dataset maintenance (optional Python tools)

Python is only needed to rebuild or validate datasets, not to run or deploy the app.
Tools and their Python tests live in `tools/`. From the project root:

```sh
.venv-mac/bin/python -m pip install -r tools/requirements-pronunciation.txt
.venv-mac/bin/python tools/finish_dataset.py
.venv-mac/bin/python -m unittest discover -s tools -p 'test_*.py'
```

Pronunciation generation also requires eSpeak NG. Historical PDF import uses
`pypdf`; the normal dataset rebuild uses the saved source snapshots.

The public repository includes only the four datasets required by the app build.
Original PDFs, Anki decks, and other reference inputs remain local in `vocab/`;
Python dataset rebuilding requires those local inputs.

Level filters group the Yohan `A1-A2` course entries under **A1** only.
Original course-band metadata remains in the source datasets; this grouping
is a study preference, not a new CEFR assessment.
