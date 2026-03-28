"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Direction } from "@/types/database";

const AGE_OPTIONS = ["20s", "30s", "40s", "50s+"];
const GENDER_OPTIONS = ["Male", "Female", "Any"];
const RELATIONSHIP_OPTIONS = [
  "Parents",
  "Friends",
  "Coworkers",
  "Partner",
  "Kids",
];

interface ProfileFormProps {
  direction: Direction;
}

export function ProfileForm({ direction }: ProfileFormProps) {
  const router = useRouter();
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [freeText, setFreeText] = useState<string>("");

  const handleSubmit = () => {
    const params = new URLSearchParams({ direction });
    if (age) params.set("age", age);
    if (gender) params.set("gender", gender.toLowerCase());
    if (relationship) params.set("relationship", relationship.toLowerCase());
    if (freeText) params.set("freeText", freeText);
    params.set("submitted", "true");
    router.push(`/recommend?${params.toString()}`);
  };

  const handleSkip = () => {
    router.push(`/recommend?direction=${direction}&submitted=true`);
  };

  const dirLabel =
    direction === "us_to_kr" ? "🇺🇸 → 🇰🇷 US to Korea" : "🇰🇷 → 🇺🇸 Korea to US";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      {/* Direction badge */}
      <div className="self-start rounded-lg bg-surface-secondary px-4 py-2">
        <span className="text-[13px] font-semibold text-fg-secondary">
          {dirLabel}
        </span>
      </div>

      <div>
        <h1 className="text-[32px] font-extrabold text-fg-primary">
          Who is this gift for?
        </h1>
        <div className="mt-2 h-[3px] w-12 rounded-full bg-accent-primary" />
        <p className="mt-3 text-[15px] text-fg-secondary">
          Tell us a little about the recipient so we can find the perfect
          country-exclusive gifts.
        </p>
      </div>

      {/* Age */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-semibold text-fg-primary">Age</label>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setAge(age === opt ? "" : opt)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                age === opt
                  ? "bg-accent-primary text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary hover:bg-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-semibold text-fg-primary">Gender</label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setGender(gender === opt ? "" : opt)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                gender === opt
                  ? "bg-accent-primary text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary hover:bg-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Relationship */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-semibold text-fg-primary">
          Relationship
        </label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() =>
                setRelationship(relationship === opt ? "" : opt)
              }
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                relationship === opt
                  ? "bg-accent-primary text-fg-inverse"
                  : "bg-surface-secondary text-fg-secondary hover:bg-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Free text */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-fg-primary">
          Tell us about them{" "}
          <span className="font-normal text-fg-muted">(optional)</span>
        </label>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="e.g., 요리 좋아하시고 건강 챙기시는 50대 엄마"
          className="rounded-lg border border-border-default px-4 py-3 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-accent-primary py-3 text-sm font-semibold text-fg-inverse transition-colors hover:bg-blue-700"
        >
          Find Gifts
        </button>
        <button
          onClick={handleSkip}
          className="rounded-lg bg-surface-secondary px-6 py-3 text-sm font-medium text-fg-primary transition-colors hover:bg-gray-200"
        >
          Show me everything
        </button>
      </div>
    </div>
  );
}
