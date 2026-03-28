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
        <span className="text-lg font-bold text-fg-primary">AJT-gift</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-fg-secondary hover:text-fg-primary"
        >
          Home
        </Link>
        <Link
          href="/list"
          className="relative flex items-center gap-1 text-sm font-medium text-fg-secondary hover:text-fg-primary"
        >
          <span>🛒</span>
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-fg-inverse">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
