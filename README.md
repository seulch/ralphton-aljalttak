# AJT-gift — Cross-Border Gift Recommendations

A web app that helps US ↔ Korea travelers find country-exclusive gifts. Powered by real community recommendations from Reddit, TikTok, Instagram, YouTube, and more.

## Core Idea

The best travel gifts are things you can **only get in that country**. AJT-gift crawls social media and communities to find what real people recommend, then uses AI to personalize suggestions for your recipient.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Price Data**: SerpAPI Google Shopping
- **SNS Crawling**: Apify (Reddit, TikTok, Instagram)
- **Search**: YouTube Data API, Naver Search API, SerpAPI

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env and fill in your keys
cp .env.example .env

# Run dev server
pnpm dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI personalization |
| `SERPAPI_KEY` | Yes | SerpAPI key for price lookups and search |
| `APIFY_TOKEN` | No | Apify token for SNS crawling (falls back to SerpAPI) |
| `YOUTUBE_API_KEY` | No | YouTube Data API key |
| `NAVER_CLIENT_ID` | No | Naver Search API client ID |
| `NAVER_CLIENT_SECRET` | No | Naver Search API secret |
| `CRON_SECRET` | No | Secret for cron job endpoints |

## How It Works

### Two-Phase Crawling Pipeline

1. **Phase 1 — Trend Discovery**: Crawls 6 sources (Reddit, TikTok, Instagram, YouTube, Google, Naver) to find what real people recommend as gifts. AI extracts product names with a strong bias toward country-exclusive items.

2. **Phase 2 — Price Lookup**: For discovered products, fetches real prices and buy links from marketplaces via SerpAPI Google Shopping. Max 3 stores per product per country, cached 24h.

### User Flow

1. **Landing**: Pick direction (US→KR or KR→US)
2. **Profile**: Tell us about the recipient (age, gender, relationship, free text)
3. **Results**: AI-ranked recommendations with category/budget filters and price links
4. **Shopping List**: Save items, get a shareable link

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/crawl` | POST | Run full pipeline (Phase 1 + 2) |
| `/api/crawl/sns` | POST | Phase 1a: SNS crawlers only |
| `/api/crawl/community` | POST | Phase 1b: Community crawlers only |
| `/api/crawl/prices` | POST | Phase 2: Batch price lookup |
| `/api/recommend` | POST | AI-personalized recommendations |
| `/api/products` | GET | Fetch products from DB |
| `/api/price-refresh` | POST | Single product price lookup |
| `/api/exchange-rate` | GET | USD/KRW exchange rate |
| `/api/list` | GET/POST | Shopping list CRUD |
| `/api/list/[token]` | GET | Shared list (read-only) |

## Scripts

```bash
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm typecheck  # TypeScript check
pnpm lint       # ESLint
```

## Built at Ralphthon SF 2026
