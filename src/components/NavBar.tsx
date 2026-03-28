"use client";

import Link from "next/link";

interface NavBarProps {
  cartCount?: number;
}

export function NavBar({ cartCount = 0 }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border-default bg-surface-primary px-6 lg:px-12">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl text-accent-primary">🎁</span>
        <span className="text-lg font-bold text-fg-primary">AJT Gifts</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/recommend?direction=us_to_kr&submitted=false"
          className="rounded-full bg-accent-primary px-3 py-1 text-xs font-semibold text-white"
        >
          KR
        </Link>
        <Link
          href="/recommend?direction=kr_to_us&submitted=false"
          className="text-xs font-semibold text-fg-muted"
        >
          US
        </Link>
        <Link
          href="/list"
          className="relative ml-1 flex items-center text-fg-secondary hover:text-fg-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
