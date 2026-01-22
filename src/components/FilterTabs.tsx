"use client";

import { useTranslations } from "next-intl";

type ReadStatusFilter = "all" | "read" | "unread";

interface FilterTabsProps {
  currentFilter: ReadStatusFilter;
  onFilterChange: (filter: ReadStatusFilter) => void;
}

export function FilterTabs({ currentFilter, onFilterChange }: FilterTabsProps) {
  const tHome = useTranslations('home');

  const filters: { value: ReadStatusFilter; label: string }[] = [
    { value: "all", label: tHome('filter.all') },
    { value: "unread", label: tHome('filter.unread') },
    { value: "read", label: tHome('filter.read') },
  ];

  return (
    <div
      className="flex items-center gap-2"
      role="tablist"
      aria-label="Filter by read status"
    >
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            currentFilter === filter.value
              ? "bg-accent text-white"
              : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
          }`}
          role="tab"
          aria-selected={currentFilter === filter.value}
          aria-controls="items-list"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
