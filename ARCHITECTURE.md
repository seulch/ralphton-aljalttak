# AJT-gift — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                               │
│                                                                      │
│  ┌──────────┐   ┌──────────────┐   ┌────────────┐   ┌────────────┐ │
│  │ Landing   │──▶│ Profile Form │──▶│ Results    │──▶│ Shopping   │ │
│  │ Page      │   │ (Recipient)  │   │ Page       │   │ List       │ │
│  │           │   │              │   │ + Prices   │   │ + Share    │ │
│  └──────────┘   └──────────────┘   └────────────┘   └────────────┘ │
│       /              /recommend        /recommend       /list       │
└────────────────────────┬─────────────────┬──────────────┬───────────┘
                         │                 │              │
                    ┌────▼─────────────────▼──────────────▼────┐
                    │              Next.js API Routes           │
                    │                                          │
                    │  POST /api/crawl        ← Full pipeline  │
                    │  POST /api/crawl/sns    ← Phase 1a       │
                    │  POST /api/crawl/community ← Phase 1b    │
                    │  POST /api/crawl/prices ← Phase 2        │
                    │  POST /api/recommend    ← AI personalize │
                    │  POST /api/price-refresh ← Single price  │
                    │  GET  /api/products     ← Fetch from DB  │
                    │  GET  /api/exchange-rate ← USD/KRW       │
                    │  POST /api/list         ← Shopping list  │
                    │  GET  /api/list/[token] ← Shared list    │
                    └──────┬───────────┬───────────┬───────────┘
                           │           │           │
              ┌────────────▼──┐  ┌─────▼─────┐  ┌─▼──────────────┐
              │  Crawling     │  │  OpenAI   │  │  Supabase      │
              │  Pipeline     │  │  GPT-4o   │  │  (PostgreSQL)  │
              │  (2 phases)   │  │           │  │  5 tables      │
              └───────────────┘  └───────────┘  └────────────────┘
```

## Two-Phase Crawling Pipeline

The core insight: **SNS and communities discover products. Marketplaces only provide prices.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POST /api/crawl                              │
│                                                                     │
│  ══════════════════════════════════════════════════════════════════  │
│  PHASE 1: TREND DISCOVERY (what do real people recommend?)          │
│  ══════════════════════════════════════════════════════════════════  │
│                                                                     │
│  ┌─── SNS (via Apify) ───────────────────────────────────────┐     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │     │
│  │  │ Reddit   │  │ TikTok   │  │Instagram │                │     │
│  │  │ r/korea  │  │ #korea   │  │ #korean  │                │     │
│  │  │ r/costco │  │ gift     │  │ gift     │                │     │
│  │  │ r/kbeauty│  │ #haul    │  │ #kbeauty │                │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘                │     │
│  └───────┼──────────────┼─────────────┼──────────────────────┘     │
│          │              │             │                             │
│  ┌─── Communities + Search ──────────────────────────────────┐     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │     │
│  │  │ YouTube  │  │ Google   │  │ Naver    │                │     │
│  │  │ haul     │  │ Search   │  │ Blog     │                │     │
│  │  │ videos   │  │ +Threads │  │ 선물추천  │                │     │
│  │  │          │  │ +X posts │  │          │                │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘                │     │
│  └───────┼──────────────┼─────────────┼──────────────────────┘     │
│          │              │             │                             │
│          ▼              ▼             ▼                             │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    Raw Text Pool                           │     │
│  │  Post titles, captions, descriptions, blog excerpts       │     │
│  │  (NO marketplace rankings — only human recommendations)   │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              OpenAI GPT-4o — Product Extractor              │     │
│  │                                                            │     │
│  │  Input: raw text from 6 community/SNS sources              │     │
│  │  Output per product:                                       │     │
│  │   - name + localized name                                  │     │
│  │   - direction (us_to_kr / kr_to_us)                        │     │
│  │   - category (food/beauty/health/tech/fashion/home)        │     │
│  │   - is_country_exclusive (boolean)                         │     │
│  │   - tags: sns_recommended / community_recommended          │     │
│  │   - trending_score (1-100, country_exclusive +25)          │     │
│  │   - why_popular, best_for fields                           │     │
│  │                                                            │     │
│  │  BIAS: country-exclusive products >> globally available    │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Deduplicate (>80% name similarity) → Upsert to Supabase  │     │
│  │  → products table (Phase 1 data only)                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ══════════════════════════════════════════════════════════════════  │
│  PHASE 2: PRICE LOOKUP (where can you buy it? how much?)           │
│  ══════════════════════════════════════════════════════════════════  │
│                                                                     │
│  For top 20 products from Phase 1:                                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              SerpAPI Google Shopping                        │     │
│  │                                                            │     │
│  │  query: "{product_name}"                                   │     │
│  │  gl=us → US marketplace prices                             │     │
│  │  gl=kr → KR marketplace prices                             │     │
│  │                                                            │     │
│  │  Filter: whitelisted stores only                           │     │
│  │  Limit: MAX 3 cheapest per country                         │     │
│  │  Output: store_name + price + product_link (real URL)      │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Store in product_prices table (24h TTL)                   │     │
│  │  Max 3 rows per product per country                        │     │
│  │  Evict most expensive if >= 3 exist                        │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## OpenAI GPT-4o Usage (2 places)

```
1. PRODUCT EXTRACTION (Phase 1)
   Raw SNS/community text → GPT-4o → Structured product data
   - Extracts specific product names from noisy social media text
   - Judges if product is country-exclusive
   - Assigns trending_score with country-exclusive bonus

2. PERSONALIZATION (Recommendation API)
   50 products from DB + user profile → GPT-4o → Ranked 10-15 picks
   - Selects best matches for recipient (age, interests, relationship)
   - Writes personalized reason per product
   - Suggests 3-5 additional country-exclusive products
```

## Recommendation Flow

```
User: "50s mom, loves cooking, going to Korea, budget $30-50"
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Query Supabase                                           │
│     SELECT * FROM products                                   │
│     WHERE direction = 'us_to_kr'                             │
│     ORDER BY trending_score DESC                             │
│     LIMIT 50                                                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  2. OpenAI GPT-4o Personalization                            │
│                                                              │
│  "PRIORITIZE country-exclusive products. A Trader Joe's      │
│   seasoning you can ONLY buy in the US is infinitely more    │
│   valuable as a gift than AirPods."                          │
│                                                              │
│  Output:                                                     │
│    recommendations[] (10-15 from DB, ranked)                 │
│      each with ai_reason:                                    │
│      "Your mom will love this — Trader Joe's spices are      │
│       a cult favorite and you can't get them in Korea"       │
│                                                              │
│    aiSuggestions[] (3-5 NOT in DB)                            │
│      country-exclusive extras                                │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  3. For each product, join product_prices (max 3 per country)│
│                                                              │
│  Product: Trader Joe's Everything Bagel Seasoning            │
│  🏷️ Only in US | 🔥 Trending on SNS                         │
│                                                              │
│  🇺🇸 Buy here:                                               │
│    Trader Joe's  $3.49  [Buy →]  ← real store URL           │
│    Amazon        $8.99  [Buy →]                              │
│    Walmart       $9.49  [Buy →]                              │
│                                                              │
│  🇰🇷 Not available in Korea                                  │
│                                                              │
│  "Your mom will love this — Korean food creators on          │
│   TikTok made this viral as a rice topping"                  │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema (5 tables)

```
┌──────────────────────────┐
│      products             │  ← Phase 1: trending products from communities
├──────────────────────────┤
│ id (uuid PK)             │
│ name (text, NOT NULL)    │
│ name_localized (text)    │
│ direction (us_to_kr|     │
│            kr_to_us)     │
│ category (food|beauty|   │
│   health|tech|fashion|   │
│   home)                  │
│ estimated_us_price       │
│ estimated_kr_price       │
│ is_country_exclusive     │     ┌────────────────────────┐
│ tags[] (sns_recommended  │     │   product_prices        │ ← Phase 2: max 3
│   community_recommended) │     ├────────────────────────┤   marketplace links
│ why_popular              │◄────│ product_id (FK)        │
│ trending_score (1-100)   │     │ country (us|kr)        │
│ source (reddit|tiktok|   │     │ store_name             │
│   instagram|youtube|     │     │ price                  │
│   google|naver)          │     │ currency               │
│ source_url               │     │ product_link (real URL)│
│ best_for_age[]           │     │ rank (1-3, 1=cheapest) │
│ best_for_interests[]     │     │ expires_at (24h TTL)   │
│ best_for_relationship[]  │     │ UNIQUE(product_id,     │
│ UNIQUE(name, direction)  │     │   country, store_name) │
└──────────────────────────┘     └────────────────────────┘

┌──────────────────────────┐     ┌────────────────────────┐
│   crawl_runs              │     │   shopping_lists        │
├──────────────────────────┤     ├────────────────────────┤
│ id (uuid PK)             │     │ id (uuid PK)           │
│ source                   │     │ anonymous_id (uuid)    │
│ phase (phase1_sns|       │     │ share_token (unique)   │
│   phase1_community|      │     │ name                   │
│   phase2_prices|pipeline)│     │ direction              │
│ status (running|         │     │ created_at             │
│   completed|failed)      │     │ updated_at             │
│ items_found              │     └───────────┬────────────┘
│ started_at               │                 │
│ completed_at             │     ┌───────────▼────────────┐
│ error                    │     │ shopping_list_items     │
└──────────────────────────┘     ├────────────────────────┤
                                 │ id (uuid PK)           │
                                 │ list_id (FK)           │
                                 │ product_id (FK)        │
                                 │ custom_name            │
                                 │ quantity               │
                                 │ checked                │
                                 └────────────────────────┘
```

## Project Structure

```
AJT-gift/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing — direction selector
│   │   ├── layout.tsx                  # Root layout + header/footer
│   │   ├── recommend/
│   │   │   └── page.tsx                # Profile form + results
│   │   ├── list/
│   │   │   ├── page.tsx                # My shopping list
│   │   │   └── [token]/
│   │   │       └── page.tsx            # Shared list (read-only)
│   │   └── api/
│   │       ├── crawl/
│   │       │   ├── route.ts            # Full pipeline (Phase 1 → 2)
│   │       │   ├── sns/route.ts        # Phase 1a: Reddit + TikTok + Instagram
│   │       │   ├── community/route.ts  # Phase 1b: YouTube + Google + Naver
│   │       │   └── prices/route.ts     # Phase 2: SerpAPI price lookup
│   │       ├── recommend/route.ts      # AI personalized recommendations
│   │       ├── price-refresh/route.ts  # Single product price lookup
│   │       ├── products/route.ts       # Fetch products from DB
│   │       ├── exchange-rate/route.ts  # USD/KRW rate
│   │       └── list/
│   │           ├── route.ts            # Shopping list CRUD
│   │           └── [token]/route.ts    # Shared list read
│   ├── lib/
│   │   ├── crawlers/
│   │   │   ├── index.ts                # RawCrawlData interface
│   │   │   ├── pipeline.ts             # Phase 1 → AI extract → Phase 2
│   │   │   ├── ai-extractor.ts         # GPT-4o product extraction
│   │   │   ├── apify-client.ts         # Shared Apify helper
│   │   │   ├── reddit.ts               # Apify trudax/reddit-scraper-lite
│   │   │   ├── tiktok.ts               # Apify clockworks/free-tiktok-scraper
│   │   │   ├── instagram.ts            # Apify apify/instagram-hashtag-scraper
│   │   │   ├── youtube.ts              # YouTube Data API v3
│   │   │   ├── google-search.ts        # SerpAPI (site:threads.net, site:x.com)
│   │   │   └── naver.ts                # Naver Search API (blog)
│   │   ├── supabase/client.ts          # Supabase client
│   │   └── utils.ts                    # Exchange rate, helpers
│   ├── components/
│   │   ├── DirectionCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── ProductCard.tsx
│   │   ├── PriceLinks.tsx              # Max 3 marketplace links per country
│   │   ├── ShoppingList.tsx
│   │   ├── FilterChips.tsx
│   │   └── SkeletonCard.tsx
│   ├── types/database.ts
│   └── data/fallback-products.ts       # 10-15 country-exclusive items
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── plans/                              # Ralph writes plans here
├── reports/                            # Ralph writes implementation reports
├── scripts/ralph/                      # Ralph loop config
├── scripts/qa/                         # QA loop config
└── .env
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (hackathon $100 credit)
OPENAI_API_KEY=

# SerpAPI ($25 Starter — 1000 searches/mo)
SERPAPI_KEY=

# YouTube Data API (free — 10K units/day)
YOUTUBE_API_KEY=

# Apify (free $5 credit — Reddit, TikTok, Instagram)
APIFY_TOKEN=

# Naver API (free — 25K/day)
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Cron job security
CRON_SECRET=
```

## Marketplace Whitelist

**US (10):** Amazon, Walmart, Target, Costco, iHerb, Bath & Body Works, Best Buy, Sephora, CVS, Trader Joe's
**KR (7):** Coupang, Naver Shopping, Gmarket, 11st, Olive Young, SSG.com, Musinsa

## Scoring Priority

1. Country-exclusive (+25 via is_country_exclusive boolean)
2. Community-recommended (+15 via tag)
3. SNS-recommended (+10 via tag)
4. Mentioned multiple times (+5)
5. Globally available products get -20 penalty
