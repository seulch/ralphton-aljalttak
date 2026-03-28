# AJT-gift — Product Requirements Document

## Project Description
Cross-border gift recommendation app for US-Korea travelers. Phase 1: Crawls SNS and communities to discover trending, country-exclusive gifts people actually recommend. Phase 2: Looks up prices and buy links from marketplaces ONLY for discovered products. Core value: gifts you can only get by traveling to that country.

## Tech Stack
- **framework**: Next.js 15 (App Router)
- **styling**: Tailwind CSS v4
- **language**: TypeScript
- **database**: Supabase (PostgreSQL)
- **llm**: OpenAI GPT-4o
- **aiChat**: Vercel AI SDK (useChat hook for streaming)
- **priceApi**: SerpAPI Google Shopping ($25 Starter, 1000 searches/mo)
- **snsScraping**: Apify (free $5 credit — Reddit, TikTok, Instagram)
- **currencyApi**: exchangerate-api.com (free)
- **packageManager**: pnpm
- **deployment**: localhost (Vercel-ready)

## Crawling Pipeline

### Phase 1: Trend Discovery (SNS + Communities)
**Purpose:** Find what real people are recommending as gifts between US and Korea. These are the SOURCE OF TRUTH for product recommendations. NOT marketplace rankings.

**Sources:**
- **Reddit (via Apify)**: r/korea, r/asianbeauty, r/costco, r/kbeauty, r/KoreanBeauty
- **TikTok (via Apify)**: korea gift, 한국 선물, trader joes haul, 올리브영 추천, us gift korea
- **Instagram (via Apify)**: koreangift, ushaul, 올리브영추천, traderjoeshaul, kbeauty
- **YouTube Data API**: 미국 쇼핑리스트, Korea haul, 한국 선물 추천, what to buy in Korea, what to buy in US for Korean
- **Google Search (via SerpAPI)**: site:threads.net korea gift, site:x.com 한국 선물 추천, best gifts from US for Koreans 2026, 한국에서 미국 선물 뭐사갈까, best Korean gifts for Americans
- **Naver Blog**: 미국 선물 추천, 한국에서 사올것, 미국여행 쇼핑리스트

### Phase 2: Price Lookup (Marketplaces)
**Purpose:** For products discovered in Phase 1, find real prices and buy links from marketplaces. This is NOT for discovering products — only for pricing products already found.
**Method:** SerpAPI Google Shopping

**US Marketplaces:** Amazon, Walmart, Target, Costco, iHerb, Bath & Body Works, Best Buy, Sephora, CVS, Trader Joe's
**KR Marketplaces:** Coupang, Naver Shopping, Gmarket, 11st, Olive Young, SSG.com, Musinsa

## Design Decisions
- **uiLanguage**: English
- **auth**: None — anonymous UUID in cookie, persisted in Supabase
- **shoppingListStorage**: Supabase + anonymous UUID + shareable token link
- **seedData**: Minimal fallback only (10-15 items). Primary data from Phase 1 crawling.
- **priceStrategy**: Phase 2 only — lookup prices for Phase 1 products. Cache 24h. Fallback to estimated prices from crawl data.
- **aiStrategy**: Phase 1 crawled data → AI extraction (country-exclusive focus) → AI personalization for recipient
- **crawlTiming**: Cron (daily automatic) + Manual refresh (1h cooldown, 3x/day limit)
- **directions**: Both US→KR and KR→US
- **categories**: ["food","beauty","health","tech","fashion","home"]
- **scoringPriority**: 1. Country-exclusive (+25) > 2. Community-recommended (+15) > 3. Price advantage (+10) > 4. Trending on SNS (+5). Globally available products get -20 penalty.

## User Stories (14)

### US-001: Project scaffolding and Supabase schema
**Priority:** 1 | **Status:** ⬜ Todo

Set up Next.js project with all dependencies and create + execute Supabase database schema.

**Acceptance Criteria:**
- [ ] Next.js 15 App Router + TypeScript + Tailwind CSS v4 initialized with pnpm
- [ ] All dependencies installed: openai, @supabase/supabase-js, serpapi, node-fetch, ai, @ai-sdk/react, @ai-sdk/openai
- [ ] Supabase migration SQL for tables: products, crawl_runs, shopping_lists, shopping_list_items, price_cache
- [ ] products table: id (uuid PK), name (text), name_localized (text nullable), direction (text: us_to_kr|kr_to_us), category (text), us_price (numeric nullable), kr_price (numeric nullable), us_available (boolean default true), kr_available (boolean default true), tags (text[]), why_popular (text), trending_score (int default 0), best_for_age (text[]), best_for_interests (text[]), best_for_relationship (text[]), buy_links_us (jsonb default '[]'), buy_links_kr (jsonb default '[]'), image_url (text nullable), source (text), source_url (text nullable), is_verified (boolean default false), is_country_exclusive (boolean default false), last_crawled_at (timestamptz), created_at (timestamptz default now()), UNIQUE(name, direction)
- [ ] CRITICAL: Execute migration SQL against Supabase — not just write file. Use Supabase MCP tools or REST API. VERIFY tables exist after.
- [ ] RLS policies for anonymous access on all tables
- [ ] TypeScript types in src/types/database.ts
- [ ] Environment variables in .env.example: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY, SERPAPI_KEY, YOUTUBE_API_KEY, APIFY_TOKEN, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, CRON_SECRET
- [ ] pnpm dev runs without errors, pnpm typecheck passes

**Notes:** UNIQUE constraint on products(name, direction) is REQUIRED for upsert. Without it, products won't save. Verify by inserting a test product and querying it back.
---

### US-002: Phase 1 crawlers — SNS (TikTok, Instagram, Reddit)
**Priority:** 2 | **Status:** ⬜ Todo

Build crawlers for social media platforms using Apify to discover what real people recommend as cross-border gifts.

**Acceptance Criteria:**
- [ ] src/lib/crawlers/reddit.ts — uses Apify trudax/reddit-scraper-lite, fetches from r/korea, r/asianbeauty, r/costco, r/kbeauty. Reads title + body fields.
- [ ] src/lib/crawlers/tiktok.ts — uses Apify clockworks/free-tiktok-scraper with {hashtags, resultsPerPage:20, excludePinnedPosts:false}. Reads text + desc fields.
- [ ] src/lib/crawlers/instagram.ts — uses Apify apify/instagram-hashtag-scraper with {hashtags, resultsLimit:20}. Reads caption field.
- [ ] src/lib/crawlers/apify-client.ts — shared helper for Apify actor runs with timeout + polling + error handling
- [ ] Each crawler returns RawCrawlData: { source: string, texts: string[], urls: string[] }
- [ ] Each crawler logs to crawl_runs table (status, products_found, timestamps)
- [ ] Each crawler handles errors gracefully — returns empty array on failure, does NOT crash pipeline
- [ ] API route POST /api/crawl/sns runs all 3 in parallel
- [ ] Test: run /api/crawl/sns → verify texts.length > 0 for at least 2 of 3 sources
- [ ] Typecheck passes

**Notes:** These are the PRIMARY sources. The whole product is built on what real people say on social media. Actor IDs and input formats are VERIFIED — do not change them.
---

### US-003: Phase 1 crawlers — Communities + Search (YouTube, Google, Naver, Threads, X)
**Priority:** 3 | **Status:** ⬜ Todo

Build crawlers for community platforms and search engines to supplement SNS trend data.

**Acceptance Criteria:**
- [ ] src/lib/crawlers/youtube.ts — YouTube Data API v3 search for gift/haul videos. Returns video titles + descriptions.
- [ ] src/lib/crawlers/google-search.ts — SerpAPI for site:threads.net and site:x.com queries + general gift recommendation searches. Returns titles + snippets.
- [ ] src/lib/crawlers/naver.ts — Naver Search API blog search for Korean gift recommendation posts. Returns excerpts.
- [ ] Each crawler returns RawCrawlData format
- [ ] Each logs to crawl_runs, handles errors gracefully
- [ ] API route POST /api/crawl/community runs all 3 in parallel
- [ ] Test: run /api/crawl/community → verify texts.length > 0
- [ ] Typecheck passes

**Notes:** Threads and X are crawled via SerpAPI site: queries — NOT Apify (Apify actors for these are broken/paid). Naver uses official API with Client-ID header.
---

### US-004: AI product extraction with country-exclusive focus
**Priority:** 4 | **Status:** ⬜ Todo

Send Phase 1 raw data to OpenAI GPT-4o to extract specific product names with strong bias toward country-exclusive items.

**Acceptance Criteria:**
- [ ] src/lib/crawlers/ai-extractor.ts takes all raw crawled text, sends to GPT-4o
- [ ] Extraction prompt MUST emphasize: 'Extract products that are UNIQUE to the origin country. Trader Joe's = US-only. 올리브영 exclusive brands = Korea-only. Ignore globally available products like AirPods or Nike unless people specifically recommend them for huge price differences.'
- [ ] Each extracted product has: name, name_localized, direction, category, tags (including country_exclusive), why_popular, trending_score, best_for fields, source, is_country_exclusive boolean
- [ ] Scoring: country_exclusive products get +25 to trending_score. Globally available products get -20.
- [ ] Deduplication: merge products with name similarity > 80%, keep highest score
- [ ] Products upserted into Supabase (on conflict name + direction)
- [ ] src/lib/crawlers/pipeline.ts orchestrates: Phase 1 (sns + community crawlers) → AI extraction → DB upsert
- [ ] API route POST /api/crawl runs full Phase 1 pipeline
- [ ] Rate limiting: 1h cooldown, 3x/day limit, tracked via crawl_runs table
- [ ] Partial failure handling: if 3/6 sources fail, process other 3
- [ ] Test: POST /api/crawl → verify products_stored > 0 and products have is_country_exclusive flags
- [ ] Typecheck passes

**Notes:** The AI prompt is EVERYTHING. It must strongly prefer country-exclusive items. Top results should be things like Trader Joe's seasonings, Bath & Body Works, 올리브영 마스크팩, 한국 김/조미료 — NOT AirPods, Nike, Samsung.
---

### US-005: Phase 2 — Price lookup for discovered products
**Priority:** 5 | **Status:** ⬜ Todo

For each product found in Phase 1, look up real prices and buy links from marketplaces using SerpAPI Google Shopping.

**Acceptance Criteria:**
- [ ] POST /api/price-refresh accepts: productName, country (us|kr)
- [ ] Calls SerpAPI Google Shopping with query=productName, gl=country
- [ ] Returns: [{store, price, currency, product_link}] sorted by price ascending
- [ ] Filters to whitelisted marketplaces only
- [ ] Caches results in price_cache table (24h expiry)
- [ ] Returns cached data if available and not expired
- [ ] Fallback: if SerpAPI fails, return estimated prices from crawl data with 'Estimated' label
- [ ] POST /api/crawl/prices — batch price lookup for top 20 products in DB (runs after Phase 1)
- [ ] Full pipeline now: POST /api/crawl runs Phase 1 → Phase 2 sequentially
- [ ] Buy links are real URLs from SerpAPI product_link field
- [ ] Test: POST /api/price-refresh with a known product → verify returns store names + prices + clickable links
- [ ] Typecheck passes

**Notes:** Phase 2 is ONLY for pricing. It does NOT discover products — Phase 1 does that. SerpAPI budget: ~2 calls per product (US+KR). Cache aggressively.
---

### US-006: Fallback seed data
**Priority:** 6 | **Status:** ⬜ Todo

Minimal hardcoded dataset of 10-15 country-exclusive products as fallback.

**Acceptance Criteria:**
- [ ] src/data/fallback-products.ts with 10-15 products (5-8 per direction)
- [ ] ALL products are country-exclusive: Trader Joe's Everything Bagel Seasoning, Bath & Body Works candles, Kirkland vitamins (US). 올리브영 마스크팩, 한국 김, 홍삼, 다이소 Korea items (KR).
- [ ] NO globally available products in fallback (no AirPods, no Nike)
- [ ] GET /api/products auto-inserts fallback if DB has < 10 products
- [ ] Typecheck passes

**Notes:** Fallback products demonstrate the core value prop. Every single one must be something you can ONLY get in that country.
---

### US-007: Landing page with direction selector
**Priority:** 7 | **Status:** ⬜ Todo

Main landing page where users pick their travel direction.

**Acceptance Criteria:**
- [ ] Landing page at / with app name 'AJT-gift' and tagline
- [ ] Two direction cards: 🇺🇸→🇰🇷 and 🇰🇷→🇺🇸
- [ ] Live stats: 'Tracking X country-exclusive gifts from Y community sources'
- [ ] Refresh Trends button with cooldown/daily limit display
- [ ] Anonymous UUID on first visit, stored in cookie
- [ ] First visit with empty DB auto-triggers Phase 1 crawl
- [ ] Clean, modern, responsive design
- [ ] Typecheck passes

---

### US-008: Recipient profile input form
**Priority:** 8 | **Status:** ⬜ Todo

Personalization form for describing the gift recipient.

**Acceptance Criteria:**
- [ ] Form at /recommend after direction selected
- [ ] Fields: age, gender, relationship, interests (multi-select), free text, budget
- [ ] Skip option: 'Show me everything'
- [ ] Form state in URL params for shareability
- [ ] Responsive, quick, fun — not a survey
- [ ] Typecheck passes

---

### US-009: AI recommendation API with country-exclusive prioritization
**Priority:** 9 | **Status:** ⬜ Todo

AI personalizes and ranks products from DB, strongly favoring country-exclusive items.

**Acceptance Criteria:**
- [ ] POST /api/recommend accepts profile + direction
- [ ] Queries Supabase products filtered by direction, ordered by trending_score DESC
- [ ] Sends top 50 products + profile to GPT-4o
- [ ] System prompt emphasizes: 'PRIORITIZE country-exclusive products. A Trader Joe's seasoning that you can ONLY buy in the US is infinitely more valuable as a gift than AirPods which anyone can order online. The gift must feel special BECAUSE the traveler went to that country.'
- [ ] Response: { recommendations: Product[], aiSuggestions: Product[], meta: {} }
- [ ] Each product has ai_reason explaining why it's a good gift FROM that country
- [ ] AI suggestions: 3-5 additional country-exclusive products not in DB
- [ ] Fallback if OpenAI fails: return products sorted by trending_score
- [ ] Typecheck passes

---

### US-010: Product recommendation results page with price links
**Priority:** 10 | **Status:** ⬜ Todo

Display recommendations as cards with country-exclusive badges, price comparison links (Skyscanner-style), and AI reasons.

**Acceptance Criteria:**
- [ ] Results page at /recommend with query params
- [ ] Each product card shows: name (+ localized), country-exclusive badge ('🏷️ Only in US' or '🏷️ Only in Korea'), AI recommendation reason, source badge (Reddit/TikTok/etc)
- [ ] Price comparison section on EVERY card (always visible, not behind button): marketplace prices sorted lowest first, each row = store + price + 'Buy →' link (target=_blank, real URL from SerpAPI)
- [ ] Savings calculation: 'Save ₩X buying in US' in green
- [ ] If no price data yet: 'Loading prices...' then auto-fetch via /api/price-refresh
- [ ] Filter chips: All / Food / Beauty / Health / Tech / Fashion / Home
- [ ] Sort: Best Match / Country Exclusive First / Biggest Savings
- [ ] Loading skeleton while AI processes
- [ ] Responsive grid: 1/2/3 columns
- [ ] Typecheck passes

**Notes:** Country-exclusive badge and price links are the two most important visual elements. Judges will click Buy links.
---

### US-011: Interactive chat on results page
**Priority:** 11 | **Status:** ⬜ Todo

Streaming chat interface for refining recommendations via natural language.

**Acceptance Criteria:**
- [ ] Vercel AI SDK useChat hook with DefaultChatTransport
- [ ] POST /api/chat streaming endpoint with product DB context + recipient profile
- [ ] Chat knows the current recommendations and recipient
- [ ] Supports: 'show me more beauty stuff', 'what's only available in Korea?', 'add this to my list'
- [ ] Streaming typewriter effect
- [ ] Collapsible panel, full-screen on mobile
- [ ] Multi-turn conversation works (context preserved across messages)
- [ ] Test: curl /api/chat with messages → verify text-delta streaming events
- [ ] If useChat frontend broken, implement fallback with raw fetch + ReadableStream
- [ ] Typecheck passes

**Notes:** Backend is confirmed working in previous tests (returns text-delta events). If frontend doesn't display responses, debug ChatPanel.tsx — the issue is likely in sendMessage or message.parts rendering.
---

### US-012: Shopping list with share link
**Priority:** 12 | **Status:** ⬜ Todo

Add-to-list functionality with Supabase persistence and shareable link.

**Acceptance Criteria:**
- [ ] Add to List button on product cards and chat inline cards
- [ ] Cart icon with count badge
- [ ] /list page: items with checkbox, quantity, remove, total cost (dual currency)
- [ ] Auto-save to Supabase via anonymous UUID
- [ ] Share button → /list/[share_token] (read-only)
- [ ] Copy-to-clipboard for share link
- [ ] Empty state with helpful message
- [ ] Typecheck passes

---

### US-013: Currency conversion + tags + visual polish
**Priority:** 13 | **Status:** ⬜ Todo

Live exchange rate, dynamic tags, and demo-ready polish.

**Acceptance Criteria:**
- [ ] GET /api/exchange-rate: USD/KRW from exchangerate-api.com, 1h cache, fallback 1350
- [ ] Dual currency on all prices: '$3.49 (₩4,700)'
- [ ] Dynamic tags: country_exclusive → '🏷️ Only in [country]', price_gap > 30% → '💰 Save X%', viral → '🔥 Trending'
- [ ] Consistent theme, smooth loading states, responsive 375/768/1280px
- [ ] Header: AJT-gift + direction + cart. Footer: 'Built at Ralphthon SF 2026'
- [ ] No console errors, favicon set, page titles set
- [ ] Typecheck passes, build succeeds

---

### US-014: End-to-end smoke test
**Priority:** 14 | **Status:** ⬜ Todo

Verify full flow works with real data.

**Acceptance Criteria:**
- [ ] Full flow: / → direction → profile → recommendations → chat → prices → list → share
- [ ] POST /api/crawl succeeds and stores > 0 products with country_exclusive flags
- [ ] Recommendations show country-exclusive items at top
- [ ] Price links are real clickable URLs
- [ ] Chat responds with streaming
- [ ] All API failures have fallbacks
- [ ] pnpm build succeeds, pnpm typecheck passes
- [ ] App runs on localhost:3000 with real data

**Notes:** The smoke test. If any step breaks, this story fails.
---

