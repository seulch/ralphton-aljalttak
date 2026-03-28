"use client";

import type { Category } from "@/types/database";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "food", label: "🍜 Food" },
  { value: "beauty", label: "💄 Beauty" },
  { value: "health", label: "💊 Health" },
  { value: "tech", label: "📱 Tech" },
  { value: "fashion", label: "👗 Fashion" },
  { value: "home", label: "🏠 Home" },
];

const BUDGETS = [
  { value: "all", label: "All" },
  { value: "0-10", label: "Under $10" },
  { value: "10-30", label: "$10–30" },
  { value: "30-50", label: "$30–50" },
  { value: "50-100", label: "$50–100" },
  { value: "100+", label: "$100+" },
];

const SORT_OPTIONS = [
  { value: "best", label: "Best Match" },
  { value: "exclusive", label: "Country Exclusive First" },
  { value: "price-asc", label: "Price: Low to High" },
];

interface FilterChipsProps {
  selectedCategory: Category | "all";
  selectedBudget: string;
  selectedSort: string;
  onCategoryChange: (cat: Category | "all") => void;
  onBudgetChange: (budget: string) => void;
  onSortChange: (sort: string) => void;
}

export function FilterChips({
  selectedCategory,
  selectedBudget,
  selectedSort,
  onCategoryChange,
  onBudgetChange,
  onSortChange,
}: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-accent-primary text-fg-inverse"
                : "bg-surface-secondary text-fg-secondary hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="mx-2 h-6 w-px bg-border-default" />
      <div className="flex flex-wrap gap-1.5">
        {BUDGETS.map((b) => (
          <button
            key={b.value}
            onClick={() => onBudgetChange(b.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedBudget === b.value
                ? "bg-accent-primary text-fg-inverse"
                : "bg-surface-secondary text-fg-secondary hover:bg-gray-200"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="mx-2 h-6 w-px bg-border-default" />
      <select
        value={selectedSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-lg border border-border-default bg-white px-3 py-1.5 text-xs text-fg-secondary"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
