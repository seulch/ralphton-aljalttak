export type Direction = "us_to_kr" | "kr_to_us";
export type Category = "food" | "beauty" | "health" | "tech" | "fashion" | "home";
export type CrawlPhase = "phase1_sns" | "phase1_community" | "phase2_prices" | "pipeline";
export type CrawlStatus = "running" | "completed" | "failed";
export type ProductTag = "sns_recommended" | "community_recommended";
export type Country = "us" | "kr";
export type CrawlSource = "reddit" | "tiktok" | "instagram" | "youtube" | "google" | "naver";

export interface Product {
  id: string;
  name: string;
  name_localized: string | null;
  direction: Direction;
  category: Category;
  estimated_us_price: number | null;
  estimated_kr_price: number | null;
  is_country_exclusive: boolean;
  tags: ProductTag[];
  why_popular: string;
  trending_score: number;
  source: CrawlSource;
  source_url: string | null;
  best_for_age: string[];
  best_for_interests: string[];
  best_for_relationship: string[];
  image_url: string | null;
  last_crawled_at: string;
  created_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  country: Country;
  store_name: string;
  price: number;
  currency: string;
  product_link: string;
  rank: number;
  fetched_at: string;
  expires_at: string;
}

export interface CrawlRun {
  id: string;
  source: string;
  phase: CrawlPhase;
  status: CrawlStatus;
  items_found: number;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface ShoppingList {
  id: string;
  anonymous_id: string;
  share_token: string;
  name: string;
  direction: Direction;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  product_id: string | null;
  custom_name: string | null;
  quantity: number;
  checked: boolean;
  created_at: string;
}

export interface ProductWithPrices extends Product {
  prices: ProductPrice[];
  ai_reason?: string;
}

export interface RawCrawlData {
  source: string;
  texts: string[];
  urls: string[];
}

export interface RecommendationRequest {
  direction: Direction;
  age?: string;
  gender?: string;
  relationship?: string;
  freeText?: string;
}

export interface RecommendationResponse {
  recommendations: ProductWithPrices[];
  aiSuggestions: ProductWithPrices[];
  meta: {
    totalProducts: number;
    direction: Direction;
    personalized: boolean;
  };
}
