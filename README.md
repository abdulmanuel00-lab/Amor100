<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/debc06b0-1e2b-4fc3-b41a-8e2b041d9bb5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy (Vercel + Backend Externo)

Este projeto usa `Socket.IO` e `better-sqlite3` no backend, entao rode o backend fora da Vercel (ex.: Render, Railway, Fly.io) e publique no Vercel apenas o frontend.

1. Publique o backend com comando de start:
   `npm run start`
2. No Vercel, configure a env var:
   `VITE_APP_URL=https://SEU-BACKEND`
3. Build do frontend:
   `npm run build`

Ja existe `vercel.json` configurado para SPA (`rewrites` para `index.html`).
"# Amor100" 
