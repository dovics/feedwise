"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Feed {
  id: string;
  title: string;
  url: string;
  tags: string[];
  titleFilter?: string | null;
  _count: {
    items: number;
  };
}

interface SidebarProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  selectedTag: string | null;
  newFeedUrl: string;
  loading: boolean;
  error: string;
  feedsExpanded: boolean;
  refreshingAll: boolean;
  refreshing: string | null;
  deletingFeed: string | null;
  onAddFeed: (e: React.FormEvent) => void;
  onNewFeedUrlChange: (url: string) => void;
  onFeedClick: (feedId: string) => void;
  onAllFeedsClick: () => void;
  onTagClick: (tag: string | null) => void;
  onRefreshFeed: (feedId: string) => void;
  onDeleteFeed: (feedId: string) => void;
  onRefreshAllFeeds: () => void;
  onToggleFeedsExpanded: () => void;
}

export function Sidebar({
  feeds,
  selectedFeedId,
  selectedTag,
  newFeedUrl,
  loading,
  error,
  feedsExpanded,
  refreshingAll,
  refreshing,
  deletingFeed,
  onAddFeed,
  onNewFeedUrlChange,
  onFeedClick,
  onAllFeedsClick,
  onTagClick,
  onRefreshFeed,
  onDeleteFeed,
  onRefreshAllFeeds,
  onToggleFeedsExpanded,
}: SidebarProps) {
  const tHome = useTranslations('home');

  const getAllTags = () => {
    const allTags = new Set<string>();
    feeds.forEach(feed => {
      if (feed.tags) {
        feed.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  const allTags = getAllTags();

  return (
    <div className="h-full overflow-y-auto lg:overflow-visible p-0">
      <div className="bg-theme-surface backdrop-blur-sm rounded-lg shadow-theme border border-theme p-4 mb-4">
        <h2 className="text-lg font-semibold mb-4 text-theme-primary">{tHome('addFeed.title')}</h2>
        <form onSubmit={onAddFeed} className="space-y-3">
          <input
            type="url"
            placeholder={tHome('addFeed.placeholder')}
            value={newFeedUrl}
            onChange={(e) => onNewFeedUrlChange(e.target.value)}
            className="w-full px-3 py-2 border border-theme rounded-md focus-ring bg-theme-surface text-theme-primary placeholder-theme-muted"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-accent hover:bg-opacity-80 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? tHome('addFeed.adding') : tHome('addFeed.button')}
          </button>
        </form>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">{tHome('addFeed.error.required')}</p>
                <p className="text-sm text-red-800 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {feeds.length > 0 && (
        <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4 mb-4">
          <h2 className="text-lg font-semibold mb-4 text-theme-primary">{tHome('tags.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTagClick(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedTag === null
                  ? "bg-accent text-white"
                  : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
              }`}
            >
              {tHome('tags.all')}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedTag === tag
                    ? "bg-accent text-white"
                    : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleFeedsExpanded}
            className="flex items-center gap-2 text-lg font-semibold text-theme-primary hover:bg-theme-surface/50 rounded-md px-2 py-1 transition-colors"
          >
            <span>{tHome('feeds.title')}</span>
            <svg
              className={`w-5 h-5 transition-transform ${feedsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={onRefreshAllFeeds}
            disabled={refreshingAll}
            className="px-3 py-1 text-sm text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="全部刷新"
          >
            {refreshingAll ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                刷新中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                全部刷新
              </>
            )}
          </button>
        </div>

        {feedsExpanded && (
          <div className="mt-4 space-y-2">
            <button
              onClick={onAllFeedsClick}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                !selectedFeedId
                  ? "bg-accent/20 text-accent"
                  : "hover:bg-theme-surface text-theme-primary"
              }`}
            >
              {tHome('feeds.allFeeds')}
            </button>
            {feeds.map((feed) => (
              <div key={feed.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onFeedClick(feed.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-md transition-colors text-sm ${
                      selectedFeedId === feed.id
                        ? "bg-accent/20 text-accent"
                        : "hover:bg-theme-surface text-theme-primary"
                    }`}
                  >
                    {feed.title}
                  </button>
                  <button
                    onClick={() => onRefreshFeed(feed.id)}
                    disabled={refreshing === feed.id}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      refreshing === feed.id
                        ? "text-accent/60 cursor-not-allowed"
                        : "text-accent hover:bg-accent/10"
                    }`}
                    title={refreshing === feed.id ? tHome('feeds.refreshing') : tHome('feeds.refresh')}
                  >
                    {refreshing === feed.id ? "⟳" : "↻"}
                  </button>
                  <button
                    onClick={() => onDeleteFeed(feed.id)}
                    disabled={deletingFeed === feed.id}
                    className="px-2 py-1 text-xs rounded transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                    title={tHome('feeds.unsubscribe')}
                  >
                    {deletingFeed === feed.id ? "..." : "✕"}
                  </button>
                </div>

                {feed.tags && feed.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
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
        )}
      </div>
    </div>
  );
}
