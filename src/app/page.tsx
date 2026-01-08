"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/UserMenu";

interface Feed {
  id: string;
  title: string;
  url: string;
  tags: string[];
  _count: {
    items: number;
  };
}

interface Item {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  read: boolean;
  feed: {
    id: string;
    title: string;
    tags?: string[];
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tHome = useTranslations('home');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [readStatusFilter, setReadStatusFilter] = useState<"all" | "read" | "unread">("unread");
  const [items, setItems] = useState<Item[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deletingFeed, setDeletingFeed] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchFeeds();
      fetchItems(undefined, undefined, readStatusFilter);
    }
  }, [status, router]);

  const fetchFeeds = async () => {
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds);
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    }
  };

  const fetchItems = async (
    feedId?: string | null,
    tag?: string | null,
    readStatus?: "all" | "read" | "unread"
  ) => {
    try {
      const params = new URLSearchParams();
      if (feedId) params.append("feedId", feedId);
      if (tag) params.append("tag", tag);
      if (readStatus && readStatus !== "all") {
        params.append("read", readStatus === "read" ? "true" : "false");
      }
      const url = `/api/items?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    feeds.forEach(feed => {
      if (feed.tags) {
        feed.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!newFeedUrl.trim()) {
      setError(tHome('addFeed.error.required'));
      setLoading(false);
      return;
    }

    if (!newFeedUrl.startsWith('http://') && !newFeedUrl.startsWith('https://')) {
      setError(tHome('addFeed.error.invalidUrl'));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newFeedUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add feed");
        return;
      }

      setNewFeedUrl("");
      await fetchFeeds();
      await fetchItems(selectedFeedId, selectedTag, readStatusFilter);
    } catch (error) {
      setError(tHome('addFeed.error.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: "POST"
      });

      if (res.ok) {
        await fetchFeeds();
        await fetchItems(selectedFeedId, selectedTag, readStatusFilter);
      } else {
        const data = await res.json();
        setError(`${tHome('feeds.refreshing')}: ${data.error || t('errors.unknown')}`);
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      setError(`${tHome('feeds.refresh')}: ${t('errors.network')}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setRefreshing(null);
    }
  };

  const deleteFeed = async (feedId: string) => {
    if (!confirm(tHome('feeds.deleteConfirm') || "确定要取消订阅这个 RSS 源吗？")) {
      return;
    }

    try {
      setDeletingFeed(feedId);
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      if (selectedFeedId === feedId) {
        setSelectedFeedId(null);
        fetchItems(undefined, selectedTag, readStatusFilter);
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setDeletingFeed(null);
    }
  };

  const handleFeedClick = (feedId: string) => {
    setSelectedFeedId(feedId);
    setSelectedTag(null);
    fetchItems(feedId, null, readStatusFilter);
  };

  const handleAllFeedsClick = () => {
    setSelectedTag(null);
    setSelectedFeedId(null);
    fetchItems(null, null, readStatusFilter);
  };

  const handleTagClick = (tag: string | null) => {
    setSelectedFeedId(null);
    setSelectedTag(tag);
    fetchItems(undefined, tag, readStatusFilter);
  };

  const handleReadStatusFilterChange = (filter: "all" | "read" | "unread") => {
    setReadStatusFilter(filter);
    fetchItems(selectedFeedId, selectedTag, filter);
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const body: any = {};
      if (selectedFeedId) body.feedId = selectedFeedId;
      if (selectedTag) body.tag = selectedTag;

      const res = await fetch("/api/items/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        // Only mark items as read if they match the current filter criteria
        // This ensures we don't mark items from other feeds/tags when filtered
        setItems(prevItems =>
          prevItems.map(item => {
            // If we're filtering by feed, only mark items from that feed
            if (selectedFeedId && item.feed.id !== selectedFeedId) {
              return item;
            }
            // If we're filtering by tag, only mark items from feeds with that tag
            if (selectedTag && !item.feed.tags?.includes(selectedTag)) {
              return item;
            }
            // Mark matching items as read
            return item.read ? item : { ...item, read: true };
          })
        );
      } else {
        const data = await res.json();
        setError(data.error || "批量标记已读失败");
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      setError("批量标记已读失败");
      setTimeout(() => setError(""), 5000);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const markAsRead = async (itemId: string) => {
    try {
      await fetch(`/api/items/${itemId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark item as read:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const allTags = getAllTags();

  return (
    <div className="min-h-screen">
      <nav className="bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-theme-primary">{t('nav.title')}</h1>
          <div className="flex items-center gap-4">
            <a
              href="/settings"
              className="text-sm text-accent hover:text-opacity-80 font-medium transition-colors"
            >
              {t('nav.settings')}
            </a>
            {["ADMIN", "SUPER_ADMIN"].includes(session.user?.role || '') && (
              <a
                href="/admin"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
              >
                {t('nav.admin')}
              </a>
            )}
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-theme-surface backdrop-blur-sm rounded-lg shadow-theme border border-theme p-4">
              <h2 className="text-lg font-semibold mb-4 text-theme-primary">{tHome('addFeed.title')}</h2>
              <form onSubmit={addFeed} className="space-y-3">
                <input
                  type="url"
                  placeholder={tHome('addFeed.placeholder')}
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
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
                      <p className="text-sm font-medium text-red-900 dark:text-red-300">{t('errors.required')}</p>
                      <p className="text-sm text-red-800 dark:text-red-400 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4 mt-4">
              <h2 className="text-lg font-semibold mb-4 text-theme-primary">{tHome('feeds.title')}</h2>
              <div className="space-y-2">
                <button
                  onClick={handleAllFeedsClick}
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
                        onClick={() => handleFeedClick(feed.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-md transition-colors text-sm ${
                          selectedFeedId === feed.id
                            ? "bg-accent/20 text-accent"
                            : "hover:bg-theme-surface text-theme-primary"
                        }`}
                      >
                        {feed.title}
                      </button>
                      <button
                        onClick={() => refreshFeed(feed.id)}
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
                        onClick={() => deleteFeed(feed.id)}
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
            </div>

            {feeds.length > 0 && (
              <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4 mt-4">
                <h2 className="text-lg font-semibold mb-4 text-theme-primary">{tHome('tags.title')}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTagClick(null)}
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
                      onClick={() => handleTagClick(tag)}
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
          </div>

          <div className="lg:col-span-3">
            <div className="bg-theme-surface rounded-lg shadow-theme border border-theme">
              <div className="px-6 py-4 border-b border-theme-subtle">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-theme-primary">
                    {selectedFeedId
                      ? feeds.find((f) => f.id === selectedFeedId)?.title ||
                        "Feed"
                      : tHome('items.title')}
                    {selectedTag && ` - ${selectedTag}`}
                  </h2>
                  {items.some(item => !item.read) && (
                    <button
                      onClick={markAllAsRead}
                      disabled={markingAllRead}
                      className="px-3 py-1 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {markingAllRead ? "标记中..." : "全部已读"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReadStatusFilterChange("all")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "all"
                        ? "bg-accent text-white"
                        : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
                    }`}
                  >
                    {tHome('filter.all')}
                  </button>
                  <button
                    onClick={() => handleReadStatusFilterChange("unread")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "unread"
                        ? "bg-accent text-white"
                        : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
                    }`}
                  >
                    {tHome('filter.unread')}
                  </button>
                  <button
                    onClick={() => handleReadStatusFilterChange("read")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "read"
                        ? "bg-accent text-white"
                        : "bg-theme-surface text-theme-primary hover:bg-theme-surface/80"
                    }`}
                  >
                    {tHome('filter.read')}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-theme-subtle">
                {items.length === 0 ? (
                  <div className="px-6 py-12 text-center text-theme-secondary">
                    {tHome('items.noItems')}
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className={`px-6 py-4 hover:bg-theme-surface/80 transition-colors ${
                        item.read ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <a
                            href={`/reader/${item.id}`}
                            onClick={() => !item.read && markAsRead(item.id)}
                            className={`text-lg font-semibold hover:underline cursor-pointer ${
                              item.read
                                ? "text-theme-secondary"
                                : "text-accent"
                            }`}
                          >
                            {item.title}
                          </a>
                          <div className="mt-1 text-sm text-theme-secondary">
                            {item.feed.title} •{" "}
                            {new Date(item.pubDate).toLocaleDateString()}
                            {item.read && (
                              <span className="ml-2 text-xs text-theme-muted">
                                {tHome('items.read')}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="mt-2 text-theme-primary line-clamp-3">
                              {item.description.replace(/<[^>]*>/g, "")}
                            </div>
                          )}
                        </div>
                        {!item.read && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="px-3 py-1 text-xs text-accent hover:bg-accent/10 rounded-md transition-colors"
                            title={tHome('items.markAsRead')}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
