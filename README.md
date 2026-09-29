# Faris Naber — Portfolio

Static site (HTML, CSS, vanilla JS). No build step.

## Run locally
```
python3 -m http.server 8000
```
Open http://localhost:8000

## Structure
- `index.html` — all content
- `styles.css`, `main.js` — design and motion
- `assets/Faris_Naber_Resume.docx` — resume draft (not published; out of date vs LinkedIn)

## Deploy
This page is published at https://naberstudio.com/faris/ as part of the studio site (repo `FirstNaber/naber-studio`).
Run `scripts/deploy.sh`: it copies this folder into `~/Projects/NaberStudio/website/faris/`, commits and pushes, and the site updates in about a minute.

## Publishing a change
Bump the number in `<meta name="build" content="…">` (and the `?v=` on styles.css / main.js) in `index.html`.
Visitors with a cached copy are sent to the new build automatically.
