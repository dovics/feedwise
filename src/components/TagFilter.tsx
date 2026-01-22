"use client";

import { useTranslations } from "next-intl";

interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onTagClick }: TagFilterProps) {
  const tHome = useTranslations('home');

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-theme-primary">
        {tHome('tags.title')}
      </h2>
      <div
        className="flex flex-wrap gap-2"
        role="list"
        aria-label="Filter by tag"
      >
        <button
          onClick={() => onTagClick(null)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            selectedTag === null
              ? "bg-accent text-white font-medium"
              : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
          }`}
          role="listitem"
          aria-pressed={selectedTag === null}
        >
          {tHome('tags.all')}
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              selectedTag === tag
                ? "bg-accent text-white font-medium"
                : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
            }`}
            role="listitem"
            aria-pressed={selectedTag === tag}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
