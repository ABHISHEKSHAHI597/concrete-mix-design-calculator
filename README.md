# Concrete Mix Proportioning — IS 10262 : 2019

Static React + Vite calculator for concrete mix design per IS 10262 : 2019.
No backend: it runs entirely in the browser.
Full technical notes: [docs/DETAILS.md](docs/DETAILS.md).

## Requirements

- Node.js 18 or newer (the CI uses 22)

## Local setup

```bash
cp .env.example .env     # optional, the defaults work
npm install
npm run dev              # http://localhost:5173
npm run verify           # checks against the annex examples, must pass
npm run build            # output in dist/
npm run preview          # serve dist/ at http://localhost:4173
```

## Environment

| Variable       | Default     | Purpose                                     |
|----------------|-------------|---------------------------------------------|
| `BASE_PATH`    | `./`        | Public path. `./` works on any path, including GitHub Pages |
| `HOST`         | `localhost` | Bind address for dev/preview (`0.0.0.0` exposes it on the network) |
| `PORT`         | `5173`      | Dev server port                             |
| `PREVIEW_PORT` | `4173`      | Preview server port                         |

These values are only read when the app is built. They are not secrets, and no runtime config is needed.

## Deploy to GitHub Pages

The included workflow `.github/workflows/deploy.yml` runs verification, builds the app and publishes it on every push to `main`.

1. Create an empty repository on GitHub, then push the code:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

2. On GitHub, open **Settings → Pages → Build and deployment**. Set **Source** to **GitHub Actions**.

3. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish. If it ran before Pages was enabled, re-run it with **Run workflow**.

4. The site is live at `https://<user>.github.io/<repo>/`.

Every later push to `main` redeploys the site automatically.

**Troubleshooting**

- *Blank page or 404 errors for assets:* keep `BASE_PATH=./`, or set it to `/<repo>/`.
- *Deploy job fails with a permissions or environment error:* check that Pages uses **GitHub Actions** as the source. Then check **Settings → Environments → github-pages**, which must allow the `main` branch.
- *Build fails at `npm run verify`:* a calculation drifted from the standard's annex values. Run `npm run verify` locally to see which check failed.
