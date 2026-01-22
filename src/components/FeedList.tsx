"use client";

import { Feed } from "@/types/feed";
import { useTranslations } from "next-intl";

interface FeedListProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  refreshing: string | null;
  deletingFeed: string | null;
  onFeedClick: (feedId: string) => void;
  onRefreshFeed: (feedId: string) => void;
  onDeleteFeed: (feedId: string) => void;
}

export function FeedList({
  feeds,
  selectedFeedId,
  refreshing,
  deletingFeed,
  onFeedClick,
  onRefreshFeed,
  onDeleteFeed,
}: FeedListProps) {
  const tHome = useTranslations('home');

  return (
    <div className="space-y-1" role="list" aria-label="Feeds">
      {feeds.map((feed) => (
        <div key={feed.id} className="space-y-1" role="listitem">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => onFeedClick(feed.id)}
              className={`flex-1 min-w-0 text-left px-3 py-2 rounded-md transition-colors text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                selectedFeedId === feed.id
                  ? "bg-accent/20 text-accent font-medium"
                  : "hover:bg-theme-surface text-theme-primary"
              }`}
              aria-current={selectedFeedId === feed.id ? "true" : undefined}
              aria-label={`View items from ${feed.title}`}
            >
              <span className="truncate block" title={feed.title}>
                {feed.title}
              </span>
            </button>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => onRefreshFeed(feed.id)}
                disabled={refreshing === feed.id}
                className={`px-1.5 py-1 text-xs rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex-shrink-0 ${
                  refreshing === feed.id
                    ? "text-accent/60 cursor-not-allowed"
                    : "text-accent hover:bg-accent/10"
                }`}
                title={refreshing === feed.id ? tHome('feeds.refreshing') : tHome('feeds.refresh')}
                aria-label={refreshing === feed.id ? `Refreshing ${feed.title}` : `Refresh ${feed.title}`}
                aria-busy={refreshing === feed.id}
              >
                {refreshing === feed.id ? "⟳" : "↻"}
              </button>
              <button
                onClick={() => onDeleteFeed(feed.id)}
                disabled={deletingFeed === feed.id}
                className="px-1.5 py-1 text-xs rounded transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex-shrink-0"
                title={tHome('feeds.unsubscribe')}
                aria-label={`Unsubscribe from ${feed.title}`}
                aria-busy={deletingFeed === feed.id}
              >
                {deletingFeed === feed.id ? "…" : "✕"}
              </button>
            </div>
          </div>

          {feed.tags && feed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1" aria-label={`Tags for ${feed.title}`}>
              {feed.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
