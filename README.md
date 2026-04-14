# Ashley Jae Carranza Website

Cloudflare Worker + D1 powered website and lightweight CMS for `ashleycarranza.com`.

## Stack

- Static multipage frontend in `public/`
- Vanilla JS modules + Bootstrap
- Cloudflare Worker runtime in `src/`
- Hono routing
- D1 persistence with Drizzle schema + SQL migrations
- Admin dashboard at `/admin/`

## What is managed in the admin

- Homepage and About page content blocks
- Hero CTA links
- Professional links
- Social links
- Speaking entries
- Privacy Policy and Terms of Use pages
- Dashboard analytics based on D1 audit logs, with optional Cloudflare traffic enrichment

## Repo layout

- `public/`: static pages, styles, client scripts, images, fallback JSON content
- `src/`: Worker routes, auth, content adapters, analytics, DB helpers
- `drizzle/`: SQL migrations
- `scripts/`: local helpers for seeding D1 and generating password hashes
- `tests/`: focused validation and auth helper tests

## Local setup

1. Install dependencies:

```bash
npm ci
```

2. Copy the local env template and fill in real values:

```bash
cp .dev.vars.example .dev.vars
```

3. Generate an admin password hash:

```bash
npm run password:hash -- "replace-with-a-strong-password"
```

4. Create a local D1 database binding in `wrangler.jsonc` if needed, then run migrations and seed:

```bash
npm run db:migrate:local
npm run db:seed:local
```

5. Start the Worker locally:

```bash
npm run dev
```

## Quality checks

```bash
npm run check
```

That runs:

- browser JS linting
- Worker/app type generation + TypeScript checks
- Vitest unit tests

## Deployment

GitHub Actions deploys the Worker from `.github/workflows/deploy.yml`.

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

Optional runtime secrets for richer traffic analytics:

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

## Cloudflare rollout checklist

1. Create the D1 database and update `wrangler.jsonc` with the real `database_id`.
2. Apply remote migrations:

```bash
npm run db:migrate:remote
```

3. Seed production content if this is a fresh database:

```bash
npm run db:seed:remote
```

4. Set Worker secrets:

```bash
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD_HASH
wrangler secret put SESSION_SECRET
```

5. Deploy:

```bash
npm run deploy
```

6. Attach the custom domain in Cloudflare once the Worker is live.

## Notes

- `public/data/*.json` remains in the repo as a fallback content source and seed source.
- `products`, `posts`, and `testimonials` are still file-backed in v1.
- Legal copy is operationally accurate to the implemented system, but should still be reviewed by counsel before launch.
