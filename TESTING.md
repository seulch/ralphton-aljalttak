# AJT-gift — Test Plan

Ralph loop을 돌리기 전, 그리고 돌린 후에 검증해야 할 모든 항목.

## 1. Build & Type Safety

- [ ] `pnpm install` succeeds without errors
- [ ] `pnpm dev` starts dev server on localhost:3000
- [ ] `pnpm build` completes without errors
- [ ] `pnpm typecheck` (or `tsc --noEmit`) passes with 0 errors
- [ ] No `any` types leaking into API response handlers
- [ ] All Supabase queries use typed client (not raw SQL strings in components)

## 2. Environment Variables

- [ ] App starts with all env vars set
- [ ] App starts with OPENAI_API_KEY missing — falls back gracefully (no crash)
- [ ] App starts with SERPAPI_KEY missing — price refresh shows "estimated prices"
- [ ] App starts with APIFY_TOKEN missing — SNS crawlers skip, other crawlers still run
- [ ] App starts with YOUTUBE_API_KEY missing — YouTube crawler skips
- [ ] App starts with NAVER_CLIENT_ID missing — Naver crawler skips
- [ ] App starts with SUPABASE keys missing — shows error page (not white screen)
- [ ] No env vars leaked to client (check: no SERPAPI_KEY, APIFY_TOKEN, OPENAI_API_KEY in browser network tab)
- [ ] .env is in .gitignore

## 3. Crawling Pipeline

### 3a. Individual Crawlers

- [ ] Reddit crawler (Apify) returns posts from r/korea, r/asianbeauty
- [ ] Reddit crawler returns empty array on Apify failure (not crash)
- [ ] YouTube crawler returns video titles + descriptions
- [ ] YouTube crawler respects 100 search/day budget
- [ ] YouTube crawler returns empty array on API error
- [ ] SerpAPI Google Search returns organic results
- [ ] SerpAPI Google Trends returns keyword popularity data
- [ ] Threads crawler (Apify) returns post content
- [ ] Instagram crawler (Apify) returns captions for hashtags
- [ ] TikTok crawler (Apify) returns video descriptions
- [ ] X/Twitter crawler (Apify) returns tweet text
- [ ] Olive Young scraper parses product names + prices correctly
- [ ] Olive Young scraper returns empty array if HTML structure changed
- [ ] Amazon Best Sellers (SerpAPI) returns ranked products
- [ ] Coupang scraper parses bestseller products
- [ ] Coupang scraper returns empty array if HTML structure changed
- [ ] Naver blog search returns relevant post excerpts
- [ ] Naver shopping search returns product prices

### 3b. Apify-Specific

- [ ] Apify client handles actor run timeout (max 60s wait)
- [ ] Apify client handles empty dataset response
- [ ] Apify client handles invalid APIFY_TOKEN (401) gracefully
- [ ] Apify credit usage is reasonable (~$1.30 per full crawl)
- [ ] Multiple Apify actors run in parallel without conflicts

### 3c. Pipeline Orchestration

- [ ] POST /api/crawl runs all 14 sources
- [ ] Pipeline completes even if 5/14 sources fail
- [ ] crawl_runs table records status for each source (running/completed/failed)
- [ ] Pipeline returns summary: { total_sources, products_found, products_stored, duration_ms, errors[] }
- [ ] Duplicate products are merged (name similarity > 80%)
- [ ] Products are upserted (not duplicated on re-crawl)
- [ ] Pipeline runtime < 5 minutes total

### 3d. Rate Limiting & Cron

- [ ] Manual refresh blocked if last crawl < 1 hour ago — returns { cached: true }
- [ ] Manual refresh blocked after 3 runs today — returns { error: "Daily limit reached" }
- [ ] GET /api/cron/crawl requires CRON_SECRET header
- [ ] GET /api/cron/crawl without secret returns 401
- [ ] Cron endpoint runs full pipeline successfully
- [ ] First visit with empty DB auto-triggers crawl

## 4. AI Product Extraction

- [ ] AI extractor receives raw text, returns structured product JSON
- [ ] Extracted products have: name, direction, category, tags, why_popular, trending_score
- [ ] AI does NOT hallucinate fake product names (verify against known products)
- [ ] AI correctly assigns direction: US products → us_to_kr, Korean products → kr_to_us
- [ ] AI correctly categorizes: food/beauty/health/tech/fashion/home
- [ ] trending_score range is 1-100 (not 0, not > 100)
- [ ] Tags are valid: only viral, price_gap, hard_to_find, on_sale
- [ ] AI handles Korean text input (네이버 블로그, 올리브영 product names)
- [ ] AI handles mixed Korean/English text
- [ ] AI extraction works with large input (500+ raw text entries)
- [ ] OpenAI failure returns empty array (not crash)
- [ ] OpenAI rate limit (429) handled with retry or graceful skip

## 5. Landing Page

- [ ] Page loads at /
- [ ] App name "AJT-gift" displayed
- [ ] Two direction cards rendered and clickable
- [ ] US→KR card navigates to /recommend?direction=us_to_kr
- [ ] KR→US card navigates to /recommend?direction=kr_to_us
- [ ] Live stats shows actual product count from DB
- [ ] Live stats shows "0 products" gracefully when DB is empty
- [ ] Anonymous UUID generated and stored in cookie
- [ ] Same UUID persists across page refreshes
- [ ] Refresh Trends button visible
- [ ] Refresh Trends disabled when last crawl < 1h (shows tooltip)
- [ ] Refresh Trends shows "Daily limit reached" after 3 runs
- [ ] Page is responsive: mobile (375px), tablet (768px), desktop (1280px)

## 6. Recipient Profile Form

- [ ] Form renders at /recommend?direction=us_to_kr
- [ ] All fields present: age, gender, relationship, interests, free text, budget
- [ ] Interests are multi-select (can pick multiple)
- [ ] Free text is optional (form submits without it)
- [ ] Budget range is single-select
- [ ] "Get Recommendations" button submits form
- [ ] "Show me everything" link skips form, loads all products
- [ ] Form state persisted in URL params
- [ ] Sharing URL with params pre-fills the form
- [ ] Form works on mobile (no overflow, no hidden buttons)
- [ ] Form submits correctly with only direction + "Show me everything" (no profile)

## 7. AI Recommendation API

- [ ] POST /api/recommend returns recommendations for valid input
- [ ] Response includes recommendations[] (from DB) and aiSuggestions[] (AI extras)
- [ ] recommendations are ranked by relevance to profile
- [ ] Each product has ai_reason field (personalized text)
- [ ] ai_reason mentions specific recipient traits ("your mom", "cooking lover")
- [ ] aiSuggestions are marked as unverified
- [ ] aiSuggestions include estimated prices
- [ ] Response includes meta: { totalCrawled, sourcesUsed }
- [ ] Response time < 15 seconds
- [ ] OpenAI failure: returns products sorted by trending_score (no ai_reason)
- [ ] Empty DB: returns fallback products
- [ ] Invalid direction parameter: returns 400 error
- [ ] Missing all profile fields: still works (returns generic recommendations)

## 8. Results Page

- [ ] Results render at /recommend with cards
- [ ] "Trending Picks" section shows DB products
- [ ] "AI Suggestions" section shows AI extras with disclaimer
- [ ] Each card shows: name, localized name, prices, tags, ai_reason, source badge, buy links
- [ ] Price comparison shows both currencies ($ and ₩)
- [ ] Savings highlighted in green
- [ ] Source badge shows where product was found (Reddit, TikTok, etc.)
- [ ] Meta banner: "Based on X products crawled from 14 sources"
- [ ] Filter chips work: clicking "Beauty" shows only beauty products
- [ ] Filter "All" resets to show everything
- [ ] Sort "Biggest Savings" reorders cards correctly
- [ ] Sort "Most Trending" reorders by trending_score
- [ ] Loading skeleton shows while API processes
- [ ] Empty state if no products match filters
- [ ] Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- [ ] Cards don't overflow or clip on mobile

## 9. Chat Interface

- [ ] Chat input bar visible at bottom of results page
- [ ] Chat is collapsible/minimizable
- [ ] Typing a message and pressing Enter sends it
- [ ] Response streams in real-time (typewriter effect)
- [ ] Chat knows the current recommendations context
- [ ] Chat knows the recipient profile
- [ ] "show me more beauty stuff" returns beauty products
- [ ] "anything cheaper?" filters by lower price
- [ ] "add the first one to my list" adds product to shopping list
- [ ] "compare prices for this" triggers price refresh inline
- [ ] Product mentions rendered as inline cards (not just text)
- [ ] Inline cards have "Add to List" button
- [ ] Multi-turn works: can reference "the second one" from previous turn
- [ ] Chat history persists during session (doesn't reset on scroll)
- [ ] Chat handles OpenAI streaming failure gracefully
- [ ] Mobile: chat opens as full-screen overlay
- [ ] Chat doesn't block scrolling the results page when minimized

## 10. Price Refresh

- [ ] "Check Latest Prices" button on product card
- [ ] Click triggers POST /api/price-refresh
- [ ] Loading spinner while fetching
- [ ] Results show marketplace prices sorted lowest first
- [ ] Only whitelisted marketplaces shown (not random stores)
- [ ] Each price has store name + buy link
- [ ] Savings calculation uses live exchange rate
- [ ] Results cached — second click returns instantly (no API call)
- [ ] Cache expires after 24h — next click fetches fresh
- [ ] SerpAPI failure shows "Estimated prices" from crawled data
- [ ] Korean product names searched correctly (한국어 query to gl=kr)
- [ ] Products with no Google Shopping results show "No live prices found"

## 11. Shopping List

- [ ] "Add to List" button works on product cards
- [ ] "Add to List" button works on chat inline cards
- [ ] Cart icon shows correct item count badge
- [ ] /list page shows all added items
- [ ] Checkbox toggles work and persist
- [ ] Quantity +/- buttons work
- [ ] Remove button removes item
- [ ] Total cost updates when items added/removed
- [ ] Total shows dual currency ($X / ₩Y)
- [ ] List auto-saves to Supabase
- [ ] List persists after browser refresh (cookie → Supabase)
- [ ] List persists after closing and reopening browser
- [ ] "Share List" generates unique /list/[token] link
- [ ] Share link copies to clipboard
- [ ] Shared link opens in new browser (no cookie needed)
- [ ] Shared link is read-only (no edit buttons)
- [ ] Invalid share token shows "List not found" page
- [ ] Empty list shows helpful message + link back to recommendations
- [ ] Adding same product twice increments quantity (not duplicate entry)

## 12. Currency Conversion

- [ ] Exchange rate API called and cached
- [ ] All prices show dual currency format
- [ ] Exchange rate refreshes after 1 hour
- [ ] API failure uses fallback rate (1 USD = 1,350 KRW)
- [ ] Savings calculation is mathematically correct
- [ ] Currency formatting correct: $189.99 not $189.990000
- [ ] Won formatting correct: ₩255,000 not ₩255000

## 13. Trending Tags

- [ ] "viral" tag shows when trending_score > 70
- [ ] "price_gap" tag auto-calculated when price diff > 30%
- [ ] "hard_to_find" tag shows when product not available in destination
- [ ] "on_sale" tag shows when flagged by crawler
- [ ] Tags colored correctly: red=viral, green=price_gap, orange=hard_to_find
- [ ] Tags don't overflow card layout on mobile
- [ ] Correct tag counts: product doesn't have 6 tags (max 3-4 relevant)

## 14. Visual & UX

- [ ] No console errors in browser
- [ ] No hydration mismatch warnings (Next.js SSR/CSR)
- [ ] Dark/neutral theme consistent across all pages
- [ ] Header shows on all pages: app name, direction indicator, cart icon
- [ ] Footer shows on all pages: "Built at Ralphthon SF 2026"
- [ ] Favicon set
- [ ] Page title set (shows in browser tab)
- [ ] Loading states (skeletons, spinners) on all async operations
- [ ] Error states are user-friendly (not raw error JSON)
- [ ] All external links open in new tab (target="_blank")
- [ ] Buy links work (not 404)
- [ ] No horizontal scroll on mobile
- [ ] Touch targets at least 44px on mobile
- [ ] Text is readable (not too small on mobile, not too large on desktop)

## 15. Security

- [ ] No API keys in client-side code or network responses
- [ ] Supabase RLS policies active (can't read other users' lists)
- [ ] CRON_SECRET required for cron endpoint
- [ ] No SQL injection via product names or search queries
- [ ] XSS prevented: product names with HTML/script tags rendered safely
- [ ] Share tokens are unguessable (UUID or random string, not sequential)
- [ ] Rate limiting prevents abuse of crawl endpoint

## 16. Performance

- [ ] Landing page loads < 2 seconds
- [ ] Crawl pipeline completes < 5 minutes
- [ ] Recommendation API responds < 15 seconds
- [ ] Price refresh responds < 5 seconds (cache miss) / < 200ms (cache hit)
- [ ] Chat first response < 3 seconds
- [ ] Shopping list operations < 500ms
- [ ] No memory leaks in chat (messages don't grow unbounded)

## 17. Demo Day Scenarios

- [ ] Full demo flow rehearsed: direction → profile → results → chat → prices → list → share
- [ ] Demo works with slow/flaky internet (fallbacks kick in)
- [ ] Demo works if OpenAI is slow (loading states, timeouts)
- [ ] Demo works if one crawl source is down (partial results still show)
- [ ] Multiple simultaneous users don't conflict (separate anonymous UUIDs)
- [ ] Judge types unexpected input in chat — doesn't crash
- [ ] Judge asks for a product not in DB — AI suggests it anyway
- [ ] Judge clicks "Refresh Trends" — works or shows cooldown message
- [ ] App recovers from Supabase connection drop (retry or error page)
- [ ] Sharing list link to judge's phone — renders correctly on mobile

## 18. Edge Cases — Crawled Data Quality

- [ ] Crawler returns product name in only Korean (no English) — AI extractor still processes it
- [ ] Crawler returns product name in only English (no Korean) — name_localized stays null, card still renders
- [ ] Crawler returns same product from 3 different sources (Reddit + TikTok + Olive Young) — deduplicated into 1 entry with highest trending_score, not 3 separate cards
- [ ] Crawler returns a product that exists in both directions (e.g., AirPods — buyable in US and KR) — assigned to correct direction based on price advantage
- [ ] Crawler returns a discontinued/out-of-stock product — price refresh shows "Not available" from SerpAPI
- [ ] Crawler returns a product with special characters in name (e.g., "Trader Joe's Everything But The Bagel™") — no DB insert errors, renders correctly
- [ ] Crawler returns emoji in product name or description — stored and displayed without corruption
- [ ] Crawler returns extremely long product name (200+ chars) — truncated in card, full name in detail view
- [ ] Crawler returns product with price = 0 or negative — filtered out before DB insert
- [ ] Crawler returns product with no price at all — stored with null prices, shows "Price unknown"
- [ ] AI extractor returns a product that isn't real (hallucination) — is_verified = false, shown in AI Suggestions only
- [ ] AI extractor returns trending_score of 0 or 101 — clamped to 1-100
- [ ] AI extractor returns invalid category (e.g., "electronics" instead of "tech") — mapped to nearest valid category
- [ ] Raw crawled text contains HTML tags or markdown — stripped before AI extraction
- [ ] Raw crawled text is empty string — skipped, not sent to AI

## 19. Edge Cases — Price & Currency

- [ ] Product only has US price, no KR price — shows "🇺🇸 $X" only, no savings calculation
- [ ] Product only has KR price, no US price — shows "🇰🇷 ₩Y" only
- [ ] Product has neither price — shows "Price unavailable" instead of $0
- [ ] SerpAPI returns price in wrong currency (e.g., CAD instead of USD) — filtered or converted
- [ ] SerpAPI returns price as string "Free" or "$0.00" — handled without crash
- [ ] SerpAPI returns price with comma format ($1,299.99) — parsed correctly
- [ ] KRW price is very large (₩1,500,000) — formatted with commas, not scientific notation
- [ ] Exchange rate API returns stale rate (> 24h old) — cache expired, fetches new or uses fallback
- [ ] Exchange rate changes significantly between crawl and price refresh — savings calculation uses latest rate
- [ ] Savings calculation results in negative (destination is cheaper) — shows "Cheaper to buy in [destination]" instead of negative savings
- [ ] Product price is same in both countries — no savings tag shown, no misleading "Save $0"
- [ ] Trader Joe's product — no online price exists (in-store only) — shows "In-store only" with store locator link

## 20. Edge Cases — User Input & Profile

- [ ] User selects no interests at all — recommendations still work (broader results)
- [ ] User fills only free text, no structured fields — AI extracts profile from free text
- [ ] User types free text in Korean ("50대 엄마 요리 좋아하심") — AI understands and personalizes
- [ ] User types very long free text (1000+ chars) — truncated before sending to OpenAI (token limit)
- [ ] User types offensive/inappropriate text — AI responds safely, no harmful recommendations
- [ ] User selects budget "$10-30" but all products cost more — shows message "No products in this budget range" + suggests raising budget
- [ ] User switches direction mid-session (was US→KR, goes back and picks KR→US) — recommendations reset, shopping list stays (separate lists per direction?)
- [ ] User opens /recommend without direction param — redirected to landing page
- [ ] User manually edits URL params to invalid values (direction=mars) — shows error or redirects to landing

## 21. Edge Cases — Shopping List

- [ ] User adds 50+ items to list — list page handles scroll, total cost doesn't overflow
- [ ] User adds item, closes browser, opens again — item still there (cookie + Supabase)
- [ ] User clears cookies — loses anonymous UUID, gets new empty list (old list still accessible via share link)
- [ ] Two browser tabs open — adding item in tab 1 reflects in tab 2 on refresh
- [ ] Share link accessed after products are re-crawled and old product_id no longer exists — shows product name from shopping_list_items.custom_name fallback
- [ ] User removes all items from list — total shows $0, share button still works (shares empty list)
- [ ] Share token collision (two lists get same token) — UUID generation makes this astronomically unlikely, but unique constraint catches it
- [ ] User tries to edit a shared list (manually posts to API with someone else's token) — RLS blocks it
- [ ] Buy link in shopping list is broken (store removed the product) — link still works (goes to store), shows 404 on store's end (not our problem, but UX note)

## 22. Edge Cases — Chat

- [ ] User asks about a product not in DB and not in recommendations — AI uses general knowledge to suggest
- [ ] User asks in Korean while UI is English — AI responds in Korean (match user language)
- [ ] User asks completely unrelated question ("what's the weather?") — AI redirects to gift recommendations
- [ ] User sends empty message — input validation prevents send
- [ ] User sends very long message (5000+ chars) — truncated or error before API call
- [ ] User rapidly sends 10 messages — previous responses cancel, latest one processes (no queue buildup)
- [ ] User says "add everything to my list" — AI adds all current recommendations (with confirmation?)
- [ ] User references "the third one" but only 2 products were discussed — AI asks for clarification
- [ ] User says "undo" or "remove the last one from my list" — AI handles list modification
- [ ] OpenAI stream cuts off mid-response (network drop) — partial response shown with "Connection lost" message
- [ ] Chat context grows too large (100+ messages) — older messages trimmed from context window, recent ones preserved
- [ ] User types product name with typo ("airpodz") — AI still matches to AirPods

## 23. Edge Cases — Crawling Timing & Concurrency

- [ ] Two users trigger manual refresh at the same time — only one crawl runs, second gets cached result
- [ ] Crawl is running when user visits — user sees stale data from DB, not waiting for crawl
- [ ] Crawl takes > 5 minutes (Apify slow) — timeout handler kills individual slow crawlers, processes what's available
- [ ] Apify actor is in maintenance/down for one platform — that crawler returns empty, others proceed
- [ ] Cron fires at midnight but app is not running (localhost) — missed cron is fine, next manual refresh catches up
- [ ] DB has products from yesterday's crawl + today's crawl — products show latest data (upsert updates, doesn't duplicate)
- [ ] Olive Young or Coupang changes their HTML structure overnight — scraper returns empty, AI extractor gets fewer products, app still works with other sources
- [ ] SerpAPI returns rate limit error (429) mid-crawl — that source marked as failed, pipeline continues

## 24. Edge Cases — Cross-Border Specific

- [ ] Product is US-only (e.g., Trader Joe's) but user is going KR→US — doesn't show in KR→US results (correct direction filtering)
- [ ] Product is available in both countries but much cheaper in one — correctly tagged as "price_gap"
- [ ] Product has no Korean equivalent/name — shows English name only, no broken localization
- [ ] Product is region-restricted (can't ship/bring across border, e.g., alcohol, supplements regulations) — not explicitly filtered but could add note
- [ ] Korean product name uses special Korean characters (ㅋㅋ, ~, ㅎㅎ in informal context) — stored and displayed correctly
- [ ] Product brand name differs by country (e.g., "Costco" in US vs "코스트코" in KR) — AI recognizes as same store
- [ ] User is going US→KR but asks chat about KR→US products — chat handles cross-direction queries

## 25. Edge Cases — Browser & Device

- [ ] Safari on iPhone — all features work (especially clipboard API for share link)
- [ ] Chrome on Android — responsive layout correct
- [ ] Firefox — no CSS compatibility issues
- [ ] Slow 3G connection — loading states visible, no timeout before content appears
- [ ] User zooms to 200% — layout doesn't break
- [ ] User uses browser back button from results to landing — form state preserved or cleanly reset
- [ ] User bookmarks /recommend?direction=us_to_kr&age=50s — loads correctly from bookmark
- [ ] PWA-like: user adds to home screen — works offline? No, but shows friendly offline message
