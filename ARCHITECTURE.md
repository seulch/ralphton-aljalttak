# AJT-gift — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                               │
│                                                                      │
│  ┌──────────┐   ┌──────────────┐   ┌────────────┐   ┌────────────┐ │
│  │ Landing   │──▶│ Profile Form │──▶│ Results    │──▶│ Shopping   │ │
│  │ Page      │   │ (Recipient)  │   │ Page       │   │ List       │ │
│  │           │   │              │   │            │   │ + Share    │ │
│  └──────────┘   └──────────────┘   └────────────┘   └────────────┘ │
│       /              /recommend        /recommend       /list       │
└────────────────────────┬─────────────────┬──────────────┬───────────┘
                         │                 │              │
                    ┌────▼─────────────────▼──────────────▼────┐
                    │              Next.js API Routes           │
                    │                                          │
                    │  POST /api/crawl      ← Full pipeline    │
                    │  POST /api/recommend  ← AI personalize   │
                    │  POST /api/price-refresh ← Live prices   │
                    │  GET  /api/products   ← Fetch from DB    │
                    │  GET  /api/exchange-rate ← USD/KRW       │
                    │  POST /api/list       ← Shopping list    │
                    │  GET  /api/list/[token] ← Shared list    │
                    └──────┬───────────┬───────────┬───────────┘
                           │           │           │
              ┌────────────▼──┐  ┌─────▼─────┐  ┌─▼──────────────┐
              │  Crawling     │  │  OpenAI   │  │  Supabase      │
              │  Pipeline     │  │  GPT-4o   │  │  (PostgreSQL)  │
              │  (14 sources) │  │           │  │                │
              └───────────────┘  └───────────┘  └────────────────┘
```

## Crawling Pipeline — Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POST /api/crawl                                   │
│                                                                     │
│  ┌─── Tier 1 (APIs) ──────────────────────────────────────────┐     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │     │
│  │  │ Reddit   │  │ YouTube  │  │ SerpAPI  │  │ SerpAPI   │ │     │
│  │  │ API      │  │ Data API │  │ Google   │  │ Google    │ │     │
│  │  │          │  │          │  │ Search   │  │ Trends    │ │     │
│  │  │ r/korea  │  │ haul     │  │ gift     │  │ keyword   │ │     │
│  │  │ r/costco │  │ videos   │  │ articles │  │ popularity│ │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │     │
│  │       │              │             │              │       │     │
│  └───────┼──────────────┼─────────────┼──────────────┼───────┘     │
│          │              │             │              │             │
│  ┌─── Tier 2 (E-commerce) ────────────────────────────────────┐     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │     │
│  │  │ Olive    │  │ Amazon   │  │ Coupang  │  │ Naver     │ │     │
│  │  │ Young    │  │ Best     │  │ Best     │  │ Blog +    │ │     │
│  │  │ TOP 100  │  │ Sellers  │  │ Sellers  │  │ Shopping  │ │     │
│  │  │ (cheerio)│  │ (serpapi)│  │ (cheerio)│  │ (API)     │ │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │     │
│  │       │              │             │              │       │     │
│  └───────┼──────────────┼─────────────┼──────────────┼───────┘     │
│          │              │             │              │             │
│  ┌─── Tier 3 (SNS via Apify) ────────────────────────────────┐     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │     │
│  │  │ Threads  │  │Instagram │  │ TikTok   │  │ X/Twitter │ │     │
│  │  │ Meta API │  │ Hashtag  │  │ Data     │  │ Scraper   │ │     │
│  │  │ +Apify   │  │ Scraper  │  │ Extractor│  │           │ │     │
│  │  │ fallback │  │          │  │          │  │           │ │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │     │
│  │       │              │             │              │       │     │
│  └───────┼──────────────┼─────────────┼──────────────┼───────┘     │
│          │              │             │              │             │
│          ▼              ▼             ▼              ▼             │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    Raw Text Pool                           │     │
│  │  Post titles, video descriptions, captions, tweets,       │     │
│  │  product names, prices, rankings, blog excerpts           │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              OpenAI GPT-4o — AI Extractor                  │     │
│  │                                                            │     │
│  │  "Extract specific product names from this data.           │     │
│  │   For each product:                                        │     │
│  │   - name + localized name                                  │     │
│  │   - direction (us_to_kr / kr_to_us)                        │     │
│  │   - category (food/beauty/health/tech/fashion/home)        │     │
│  │   - prices if mentioned                                    │     │
│  │   - why it's trending                                      │     │
│  │   - tags: viral / price_gap / hard_to_find / on_sale       │     │
│  │   - trending_score (1-100)                                 │     │
│  │   - who it's best for (age, interests, relationship)"      │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
│                         │                                           │
│                         ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              Deduplication + Upsert                         │     │
│  │  Name similarity > 80% → merge (keep highest score)        │     │
│  │  Upsert into Supabase products table                       │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Recommendation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
│                                                             │
│  Direction: 🇺🇸→🇰🇷                                         │
│  Recipient: 50s / female / parents / cooking,health         │
│  Free text: "Mom who loves cooking, health-conscious"       │
│  Budget: $30-50                                             │
└──────────────────────┬──────────────────────────────────────┘
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
│  Input: 50 products + recipient profile                      │
│  Output:                                                     │
│    ├── recommendations[] (10-15 from DB, ranked)             │
│    │   └── each has ai_reason:                               │
│    │       "Your mom will love this — #1 K-beauty            │
│    │        sunscreen, 60% cheaper in Korea"                 │
│    │                                                         │
│    └── aiSuggestions[] (3-5 NOT in DB)                       │
│        └── "Trader Joe's Chili Lime Seasoning —              │
│             perfect for a mom who loves experimenting"       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Response to Client                                       │
│                                                              │
│  {                                                           │
│    recommendations: [...],  // from DB, AI-ranked            │
│    aiSuggestions: [...],    // AI-generated extras            │
│    meta: {                                                   │
│      totalCrawled: 147,                                      │
│      sourcesUsed: 14,                                        │
│      lastCrawled: "2 hours ago"                              │
│    }                                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

## Price Refresh Flow

```
User clicks "Check Latest Prices" on AirPods Pro 2
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /api/price-refresh                                     │
│  { productName: "AirPods Pro 2", country: "us" }            │
│                                                              │
│  1. Check price_cache (Supabase) — expired?                  │
│     └── If fresh (< 24h): return cached ──────────────▶ UI  │
│                                                              │
│  2. If expired/missing:                                      │
│     SerpAPI Google Shopping                                  │
│     ├── gl=us: "AirPods Pro 2"                               │
│     └── gl=kr: "에어팟 프로 2"                                │
│                                                              │
│  3. Filter to whitelisted marketplaces                       │
│     ├── 🇺🇸 Amazon   $189.99  [link]                         │
│     ├── 🇺🇸 Walmart  $179.00  [link]  ← lowest              │
│     ├── 🇺🇸 Best Buy $189.99  [link]                         │
│     ├── 🇰🇷 Coupang  ₩359,000 [link]                        │
│     └── 🇰🇷 Naver    ₩349,000 [link]                        │
│                                                              │
│  4. Cache results in Supabase (24h expiry)                   │
│  5. Return to UI with exchange rate applied                  │
│                                                              │
│  💰 Save ₩110,000 (~$82) buying in the US                   │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────┐     ┌──────────────────────┐
│      products        │     │     crawl_runs        │
├─────────────────────┤     ├──────────────────────┤
│ id (uuid PK)        │     │ id (uuid PK)         │
│ name                │     │ source               │
│ name_localized      │     │ status               │
│ direction           │     │ products_found       │
│ category            │     │ started_at           │
│ us_price            │     │ completed_at         │
│ kr_price            │     │ error                │
│ us_available        │     └──────────────────────┘
│ kr_available        │
│ tags[]              │     ┌──────────────────────┐
│ why_popular         │     │     price_cache       │
│ trending_score      │     ├──────────────────────┤
│ best_for_age[]      │     │ id (uuid PK)         │
│ best_for_interests[]│     │ product_name         │
│ best_for_relation[] │     │ country              │
│ buy_links_us (jsonb)│     │ results (jsonb)      │
│ buy_links_kr (jsonb)│     │ fetched_at           │
│ image_url           │     │ expires_at           │
│ source              │     └──────────────────────┘
│ source_url          │
│ is_verified         │     ┌──────────────────────┐
│ last_crawled_at     │     │   shopping_lists      │
│ created_at          │     ├──────────────────────┤
└─────────────────────┘     │ id (uuid PK)         │
                            │ anonymous_id (uuid)  │
┌─────────────────────┐     │ share_token (unique)  │
│ shopping_list_items  │     │ name                 │
├─────────────────────┤     │ direction            │
│ id (uuid PK)        │     │ total_estimated_cost │
│ list_id (FK) ───────┼────▶│ created_at           │
│ product_id (FK)     │     │ updated_at           │
│ custom_name         │     └──────────────────────┘
│ quantity            │
│ checked             │
│ notes               │
│ created_at          │
└─────────────────────┘
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
│   │       │   ├── route.ts            # Full pipeline trigger
│   │       │   ├── tier1/route.ts      # Reddit + YouTube + Google
│   │       │   ├── tier2/route.ts      # Olive Young + Amazon + Coupang + Naver
│   │       │   └── tier3/route.ts      # Threads + Instagram + TikTok + X
│   │       ├── recommend/route.ts      # AI personalized recommendations
│   │       ├── price-refresh/route.ts  # SerpAPI live price lookup
│   │       ├── products/route.ts       # Fetch products from DB
│   │       ├── exchange-rate/route.ts  # USD/KRW rate
│   │       ├── list/route.ts           # Shopping list CRUD
│   │       ├── list/[token]/route.ts   # Shared list read
│   │       └── seed/route.ts           # Fallback seed insert
│   ├── lib/
│   │   ├── crawlers/
│   │   │   ├── index.ts                # CrawlerResult interface + exports
│   │   │   ├── pipeline.ts             # Orchestrator: all tiers → AI → DB
│   │   │   ├── ai-extractor.ts         # OpenAI product extraction
│   │   │   ├── reddit.ts               # Reddit API crawler
│   │   │   ├── youtube.ts              # YouTube Data API crawler
│   │   │   ├── google-search.ts        # SerpAPI Google Search
│   │   │   ├── google-trends.ts        # SerpAPI Google Trends
│   │   │   ├── oliveyoung.ts           # Olive Young web scraper
│   │   │   ├── amazon-bestsellers.ts   # Amazon via SerpAPI
│   │   │   ├── coupang.ts              # Coupang web scraper
│   │   │   ├── naver.ts                # Naver Blog + Shopping API
│   │   │   ├── threads.ts              # Meta API + Apify fallback
│   │   │   ├── instagram.ts            # Apify Instagram
│   │   │   ├── tiktok.ts               # Apify TikTok
│   │   │   ├── x-twitter.ts            # Apify X
│   │   │   └── apify-client.ts         # Shared Apify helper
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── openai.ts                   # OpenAI client
│   │   └── utils.ts                    # Exchange rate, helpers
│   ├── components/
│   │   ├── DirectionCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── ProductCard.tsx
│   │   ├── PriceComparison.tsx
│   │   ├── ShoppingList.tsx
│   │   ├── FilterChips.tsx
│   │   ├── TrendTag.tsx
│   │   └── SkeletonCard.tsx
│   ├── types/
│   │   └── database.ts                 # TypeScript types
│   └── data/
│       └── fallback-products.ts        # 10-15 fallback items
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── prd.json
├── ARCHITECTURE.md
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (provided at hackathon — $100 credit)
OPENAI_API_KEY=

# SerpAPI ($25 Starter — 1000 searches/mo)
SERPAPI_KEY=

# Reddit API (free)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=

# YouTube Data API (free — 10K units/day)
YOUTUBE_API_KEY=

# Threads / Meta API (free — 500 searches/7days)
THREADS_ACCESS_TOKEN=

# Apify (free $5 credit — Instagram, TikTok, X, Threads fallback)
APIFY_TOKEN=

# Naver API (free — 25K/day)
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```
