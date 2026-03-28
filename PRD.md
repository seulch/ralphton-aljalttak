# AJT-gift — PRD

Cross-border gift recommendation app for US-Korea travelers. Phase 1: Crawls SNS and communities to discover trending, country-exclusive gifts people actually recommend. Phase 2: Looks up prices and buy links from marketplaces ONLY for discovered products. Core value: gifts you can only get by traveling to that country.

## Stories (13)

### US-001: Project scaffolding and Supabase schema
Set up Next.js project with all dependencies and create + execute Supabase database schema.
---
### US-002: Phase 1 crawlers — SNS (TikTok, Instagram, Reddit)
Build crawlers for social media platforms using Apify to discover what real people recommend as cross-border gifts.
---
### US-003: Phase 1 crawlers — Communities + Search (YouTube, Google, Naver, Threads, X)
Build crawlers for community platforms and search engines to supplement SNS trend data.
---
### US-004: AI product extraction with country-exclusive focus
Send Phase 1 raw data to OpenAI GPT-4o to extract specific product names with strong bias toward country-exclusive items.
---
### US-005: Phase 2 — Price lookup for discovered products
For each product found in Phase 1, look up real prices and buy links from marketplaces using SerpAPI Google Shopping.
---
### US-006: Fallback seed data
Minimal hardcoded dataset of 10-15 country-exclusive products as fallback.
---
### US-007: Landing page with direction selector
Main landing page where users pick their travel direction.
---
### US-008: Recipient profile input form
Personalization form for describing the gift recipient.
---
### US-009: AI recommendation API with country-exclusive prioritization
AI personalizes and ranks products from DB, strongly favoring country-exclusive items.
---
### US-010: Product recommendation results page with price links
Display recommendations as cards with country-exclusive badges, price comparison links (Skyscanner-style), and AI reasons.
---
### US-012: Shopping list with share link
Add-to-list functionality with Supabase persistence and shareable link.
---
### US-013: Currency conversion + tags + visual polish
Live exchange rate, dynamic tags, and demo-ready polish.
---
### US-014: End-to-end smoke test
Verify full flow works with real data.
---
