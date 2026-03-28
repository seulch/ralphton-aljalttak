# AJT-gift — Test Plan

## 1. Build & Type Safety
- [ ] `pnpm install` succeeds
- [ ] `pnpm dev` starts on localhost:3000
- [ ] `pnpm build` completes without errors
- [ ] `pnpm typecheck` passes with 0 errors

## 2. Environment Variables
- [ ] App starts with all env vars set
- [ ] App starts with OPENAI_API_KEY missing — falls back gracefully
- [ ] App starts with SERPAPI_KEY missing — shows estimated prices
- [ ] App starts with APIFY_TOKEN missing — SNS crawlers skip, others run
- [ ] No env vars leaked to client
- [ ] .env is in .gitignore

## 3. Phase 1 Crawlers — SNS
- [ ] Reddit (trudax/reddit-scraper-lite): returns posts with title, body, link
- [ ] TikTok (clockworks/free-tiktok-scraper): returns results with text, desc, webVideoUrl
- [ ] Instagram (apify/instagram-hashtag-scraper): returns captions with caption, url
- [ ] POST /api/crawl/sns runs all 3 in parallel
- [ ] Each returns empty array on failure (not crash)
- [ ] Partial failure: if 1/3 fails, others still return data

## 4. Phase 1 Crawlers — Communities
- [ ] YouTube: returns video titles + descriptions
- [ ] Google Search (SerpAPI): returns site:threads.net and site:x.com results
- [ ] Naver Blog: returns blog excerpts
- [ ] POST /api/crawl/community runs all 3 in parallel
- [ ] Partial failure handling works

## 5. AI Product Extraction (GPT-4o)
- [ ] Extracts specific product names (not generic items)
- [ ] Assigns correct direction (us_to_kr / kr_to_us)
- [ ] Assigns correct category
- [ ] Sets is_country_exclusive correctly
- [ ] Tags: sns_recommended and/or community_recommended only
- [ ] trending_score: country_exclusive +25, globally available -20
- [ ] Handles Korean and mixed text
- [ ] Deduplication works (>80% similarity merged)
- [ ] Returns empty array on OpenAI failure

## 6. Phase 2 — Price Lookup
- [ ] POST /api/price-refresh returns max 3 prices per country
- [ ] Sorted cheapest first
- [ ] Filtered to whitelisted marketplaces
- [ ] product_link is real clickable URL
- [ ] Stored in product_prices table with 24h TTL
- [ ] Cached results returned if not expired
- [ ] Eviction: most expensive deleted when >= 3 exist
- [ ] Fallback: estimated prices if SerpAPI fails

## 7. Full Pipeline
- [ ] POST /api/crawl runs Phase 1 then Phase 2 sequentially
- [ ] products_stored > 0 after run
- [ ] product_prices populated for top products
- [ ] crawl_runs records each source status
- [ ] Rate limiting: 1h cooldown, 3x/day limit

## 8. Landing Page
- [ ] Loads at / with HTTP 200
- [ ] "AJT-gift" branding visible
- [ ] Two direction cards clickable
- [ ] Live product count from DB
- [ ] Refresh Trends button with cooldown
- [ ] Anonymous UUID on first visit
- [ ] Responsive layout

## 9. Profile Form
- [ ] Renders at /recommend?direction=us_to_kr
- [ ] All fields present and functional
- [ ] "Show me everything" skip works
- [ ] Form state in URL params

## 10. AI Recommendation
- [ ] POST /api/recommend returns personalized results
- [ ] Country-exclusive products ranked at top
- [ ] Each product has ai_reason
- [ ] aiSuggestions: 3-5 extra country-exclusive picks
- [ ] Fallback: trending_score sort if OpenAI fails

## 11. Results Page
- [ ] Product cards with name, localized name, category
- [ ] Country-exclusive badge visible
- [ ] Tags: "🔥 Trending on SNS", "💬 Community Pick"
- [ ] Max 3 price links per country always visible
- [ ] "Buy →" links open real store URL in new tab
- [ ] Savings calculation in green
- [ ] Filter chips work
- [ ] Sort options work
- [ ] Loading skeleton
- [ ] Responsive grid

## 12. Shopping List
- [ ] Add to List works
- [ ] Cart badge count correct
- [ ] /list shows items with checkbox, quantity, remove
- [ ] Total cost dual currency
- [ ] Share link generates and works read-only
- [ ] Copy-to-clipboard
- [ ] Empty state message

## 13. Currency & Tags
- [ ] Exchange rate returns USD/KRW
- [ ] Dual currency on all prices
- [ ] Fallback rate 1,350
- [ ] Tags display correctly with colors

## 14. Error Handling
- [ ] OpenAI failure → fallback sort
- [ ] SerpAPI failure → estimated prices
- [ ] Supabase failure → error page
- [ ] Invalid share token → "List not found"
- [ ] Empty DB → fallback seed products

## 15. Country-Exclusive Scoring
- [ ] Trader Joe's > AirPods in ranking
- [ ] 올리브영 exclusive > Samsung
- [ ] Top 5 results are country-exclusive
- [ ] No globally available products dominate

## 16. Price Links
- [ ] Max 3 per country per product
- [ ] Real URLs (not 404)
- [ ] Sorted cheapest first
- [ ] target="_blank" rel="noopener noreferrer"
