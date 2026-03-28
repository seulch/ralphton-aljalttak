"use client";

import { useRouter } from "next/navigation";
import type { Direction } from "@/types/database";

interface DirectionCardProps {
  direction: Direction;
}

const CARD_CONFIG = {
  us_to_kr: {
    label: "US → KR",
    title: "Going to Korea",
    subtitle: "Find the best gifts to bring from the US",
    gradient: "bg-gradient-to-b from-gray-50 to-surface-secondary",
    textColor: "text-fg-primary",
    subColor: "text-fg-secondary",
    labelColor: "text-fg-primary",
  },
  kr_to_us: {
    label: "KR → US",
    title: "Going to the US",
    subtitle: "Find the best gifts to bring from Korea",
    gradient: "bg-gradient-to-b from-gray-800 to-surface-inverse",
    textColor: "text-white",
    subColor: "text-white",
    labelColor: "text-white",
  },
};

export function DirectionCard({ direction }: DirectionCardProps) {
  const router = useRouter();
  const config = CARD_CONFIG[direction];

  return (
    <button
      onClick={() => router.push(`/recommend?direction=${direction}`)}
      className={`group flex w-full max-w-md flex-col items-center gap-4 rounded-2xl p-8 transition-all hover:scale-[1.02] hover:shadow-lg ${config.gradient}`}
    >
      <div className={`text-3xl font-extrabold ${config.labelColor}`}>
        {config.label}
      </div>
      <div className="text-center">
        <h2 className={`text-xl font-bold ${config.textColor}`}>
          {config.title}
        </h2>
        <p className={`mt-1 text-sm ${config.subColor}`}>{config.subtitle}</p>
      </div>
    </button>
  );
}
