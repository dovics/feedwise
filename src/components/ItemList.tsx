"use client";

import { Item } from "@/types/item";
import { useTranslations } from "next-intl";

interface ItemListProps {
  items: Item[];
  selectedFeedId: string | null;
  feeds: Array<{ id: string; title: string }>;
  onItemClick: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  loadingMore?: boolean;
  hasMore?: boolean;
}

export function ItemList({
  items,
  selectedFeedId,
  feeds,
  onItemClick,
  onMarkAsRead,
  loadingMore = false,
  hasMore = true,
}: ItemListProps) {
  const tHome = useTranslations('home');

  if (items.length === 0) {
    return (
      <div
        className="px-6 py-12 text-center text-theme-secondary"
        role="status"
        aria-live="polite"
      >
        {tHome('items.noItems')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-theme-subtle" id="items-list" role="list">
      {items.map((item, index) => (
        <article
          key={item.id}
          className={`px-6 py-4 hover:bg-theme-surface/80 transition-colors ${
            item.read ? "opacity-60" : ""
          }`}
          role="listitem"
          aria-posinset={index + 1}
          aria-setsize={items.length}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <a
                href={`/reader/${item.id}`}
                onClick={() => {
                  onItemClick(item.id);
                  if (!item.read) {
                    onMarkAsRead(item.id);
                  }
                }}
                className={`text-lg font-semibold hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded ${
                  item.read
                    ? "text-theme-primary"
                    : "text-accent"
                }`}
                aria-label={`Read ${item.title}${item.read ? " (already read)" : ""}`}
              >
                <span className="line-clamp-2">{item.title}</span>
              </a>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded-md transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  title="打开原文"
                  aria-label={`Open original article: ${item.title} (opens in new tab)`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  原文
                </a>
                {!item.read && (
                  <button
                    onClick={() => onMarkAsRead(item.id)}
                    className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    title={tHome('items.markAsRead')}
                    aria-label={`Mark ${item.title} as read`}
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm text-theme-secondary">
              <span className="truncate inline-block max-w-[200px]" title={item.feed.title}>
                {item.feed.title}
              </span>
              {" • "}
              <time dateTime={item.pubDate}>
                {new Date(item.pubDate).toLocaleDateString()}
              </time>
              {item.read && (
                <span className="ml-2 text-xs text-theme-muted" aria-label="Already read">
                  {tHome('items.read')}
                </span>
              )}
            </div>
            {item.description && (
              <p className="mt-2 text-theme-primary line-clamp-3" aria-hidden="true">
                {item.description.replace(/<[^>]*>/g, "")}
              </p>
            )}
          </div>
        </article>
      ))}

      {loadingMore && (
        <div
          className="px-6 py-8 text-center text-theme-secondary"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-accent"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading…</span>
          </div>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div
          className="px-6 py-4 text-center text-sm text-theme-muted"
          role="status"
          aria-live="polite"
        >
          {tHome('items.noMoreItems') || "没有更多内容了"}
        </div>
      )}
    </div>
  );
}
