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
- `assets/Faris_Naber_Resume.docx` — downloadable resume

## Deploy
GitHub Pages serves the `main` branch root. Push to `main` and the site updates in about a minute.
Settings → Pages → Source: Deploy from a branch → `main` / root.

## Publishing a change
Bump the number in `<meta name="build" content="…">` (and the `?v=` on styles.css / main.js) in `index.html`.
Visitors with a cached copy are sent to the new build automatically.
