# Pathora

A web-based career consultancy and discovery platform for African students. Two core features: a consultant booking system and an AI-powered career discovery questionnaire.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Lucide icons**. All data is hardcoded mock data in `lib/data.ts` — no backend.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Pages

| Route | Description |
| --- | --- |
| `/` | Landing page — hero, how it works, sectors, features, testimonials |
| `/explore` | Consultant explore page with search, sticky sector filters, and sorting |
| `/consultants/[id]` | Consultant profile with sticky booking card and related consultants |
| `/discover` | 6-step career discovery questionnaire → AI-style results with roadmap and consultant bridge |
| `/dashboard` | Student dashboard — stats, upcoming session, recommendations, opportunities |
| `/session/[id]` | Video session room with timer, call controls, and notes sidebar |

## Structure

```
app/          — routes (App Router)
components/   — ui primitives, layout, consultant, discover, opportunities, dashboard
lib/          — mock data and TypeScript types
```
