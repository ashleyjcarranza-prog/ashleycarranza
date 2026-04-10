# Ashley Jae Carranza Website

Static HTML/CSS/JS site with clean routing and JSON-driven content.

## UI Libraries
- Bootstrap 5.3.8
- Bootstrap Icons 1.11.3
- AOS 2.3.1 (scroll animations)

## Frontend architecture
- Shared bootstrap: `assets/js/main.js`
- Core utilities: `assets/js/core/`
- Page initializers: `assets/js/pages/`
- Global metadata and navigation: `data/site.json`

Pages opt into behavior with `data-page` on the `<body>` element. This keeps GitHub Pages hosting simple while making it easier to add new sections without duplicating helper code.

## GitHub Pages deployment
A GitHub Actions workflow is included at `.github/workflows/deploy.yml` and deploys on pushes to `main`.

## Content updates
- Products: `data/products.json`
- Events: `data/events.json`
- Global metadata: `data/site.json`

## Adding a new section
1. Add the page folder and `index.html`.
2. Set a `data-page` value on the page `<body>`.
3. Add the nav entry in `data/site.json` if it should appear globally.
4. Create a page initializer in `assets/js/pages/` only if the page needs custom behavior.

## Local preview
```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`
