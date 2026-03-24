# AreeqAttire — Shopify 3D Hero Bundle

This folder contains everything needed to put the spinning 3D logo + sandstorm particle animation onto your Shopify store.

---

## Folder Contents

| File | Purpose |
|---|---|
| `src/areeq-hero.js` | The animation — plain Three.js, no React |
| `vite.config.js` | Bundles it into a single `.js` file |
| `package.json` | Project dependencies |
| `hero-3d.liquid` | Drop into your Shopify theme as a section |

---

## Step 1 — Build the Bundle

Open a terminal in this folder (`shopify-bundle/`) and run:

```bash
npm install
npm run build
```

This produces **`dist/areeq-hero.iife.js`** — a single, self-contained file (~500–700kb) with Three.js included.

---

## Step 2 — Upload to Shopify

1. In Shopify Admin go to **Online Store → Themes → ··· → Edit code**
2. Under **Assets**, click **Add a new asset** and upload:
   - `dist/areeq-hero.iife.js`
   - Your `logo.svg` (from `c:\...\Website\site\public\logo.svg`)

---

## Step 3 — Add the Section to Your Theme

1. Still in the theme code editor, go to **Sections**
2. Click **Add a new section** → name it `hero-3d`
3. Paste the entire contents of `hero-3d.liquid` into the editor and save

---

## Step 4 — Add it to Your Homepage

1. Go to **Online Store → Themes → Customize**
2. On the Homepage, click **Add section**
3. Find **3D Hero** and add it
4. Drag it to the top of the page

> **Tip:** Delete or hide Shopify's default "Image banner" section since the 3D hero replaces it.

---

## Step 5 — Test It

Visit your Shopify store preview. You should see the spinning gold logo with the sandstorm particle effect identical to your Next.js site.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Black screen, no logo | Check that `logo.svg` was uploaded to Assets and the filename matches exactly |
| Animation doesn't start | Open browser console and check for errors; ensure the `defer` script loaded |
| Very slow on mobile | Reduce `count` in `areeq-hero.js` from `180000` to `80000` and rebuild |
