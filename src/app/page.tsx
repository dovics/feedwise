"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/UserMenu";
import { DailySummary } from "@/components/DailySummary";

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

interface DailySummaryData {
  id: string;
  date: string;
  content: string;
  language: string;
  itemCount: number;
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoRefreshed, setAutoRefreshed] = useState(false);
  const [feedsExpanded, setFeedsExpanded] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [markReadError, setMarkReadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchFeeds();

      // Check and generate today's summary
      fetch("/api/summaries/generate", {
        method: "POST"
      })
        .then(res => res.json())
        .then(data => {
          if (data.summary) {
            setSummary(data.summary);
            setSummaryError(null);
          } else if (data.error) {
            setSummaryError(data.error);
          }
        })
        .catch(error => {
          console.error("Failed to check summary:", error);
        });

      // 尝试从 sessionStorage 恢复状态
      const savedState = sessionStorage.getItem('feedflow_home_state');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setSelectedFeedId(state.feedId);
          setSelectedTag(state.tag);
          setReadStatusFilter(state.readStatus);
          setItems(state.items || []);
          setPage(1);
          setHasMore(true);

          // 清除保存的状态
          sessionStorage.removeItem('feedflow_home_state');

          // 恢复滚动位置
          setTimeout(() => {
            window.scrollTo(0, state.scrollPosition || 0);
          }, 100);
        } catch (error) {
          console.error('Failed to restore state:', error);
          fetchItems(undefined, undefined, readStatusFilter, 1, false);
        }
      } else {
        fetchItems(undefined, undefined, readStatusFilter, 1, false);
      }
    }
  }, [status, router]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= docHeight - 200 && hasMore && !loadingMore) {
        loadMoreItems();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, selectedFeedId, selectedTag, readStatusFilter]);

  const loadMoreItems = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchItems(selectedFeedId, selectedTag, readStatusFilter, nextPage, true);
    setLoadingMore(false);
  };

  const fetchFeeds = async () => {
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds);

        // 如果订阅数量超过10个，默认收起
        if (data.feeds.length > 10) {
          setFeedsExpanded(false);
        }

        // 自动刷新所有订阅源（只执行一次）
        // 完全异步，不阻塞用户界面，不刷新当前列表
        if (!autoRefreshed && data.feeds.length > 0) {
          setAutoRefreshed(true);
          // 静默后台刷新，不干扰用户体验
          fetch("/api/feeds/refresh-all", {
            method: "POST"
          }).then(refreshRes => {
            if (refreshRes.ok) {
              console.log("Auto-refreshed all feeds in background");
              // 可选：显示一个小提示告知用户有新内容
              // 不自动刷新列表，让用户自己决定何时刷新
            }
          }).catch(error => {
            console.error("Auto-refresh failed:", error);
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    }
  };

  const fetchItems = async (
    feedId?: string | null,
    tag?: string | null,
    readStatus?: "all" | "read" | "unread",
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      const params = new URLSearchParams();
      if (feedId) params.append("feedId", feedId);
      if (tag) params.append("tag", tag);
      if (readStatus && readStatus !== "all") {
        params.append("read", readStatus === "read" ? "true" : "false");
      }
      params.append("page", pageNum.toString());
      params.append("limit", "20");

      const url = `/api/items?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        const newItems = data.items || [];
        if (append) {
          setItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id));
            const uniqueNewItems = newItems.filter((item: Item) => !existingIds.has(item.id));
            return [...prevItems, ...uniqueNewItems];
          });
        } else {
          setItems(newItems);
        }
        setHasMore(newItems.length === 20);
        setPage(pageNum);
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
        body: JSON.stringify({
          url: newFeedUrl
        })
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
    setItems([]);
    setPage(1);
    fetchItems(feedId, null, readStatusFilter, 1, false);
  };

  const handleAllFeedsClick = () => {
    setSelectedTag(null);
    setSelectedFeedId(null);
    setItems([]);
    setPage(1);
    fetchItems(null, null, readStatusFilter, 1, false);
  };

  const handleTagClick = (tag: string | null) => {
    setSelectedFeedId(null);
    setSelectedTag(tag);
    setItems([]);
    setPage(1);
    fetchItems(undefined, tag, readStatusFilter, 1, false);
  };

  const handleReadStatusFilterChange = (filter: "all" | "read" | "unread") => {
    setReadStatusFilter(filter);
    setItems([]);
    setPage(1);
    fetchItems(selectedFeedId, selectedTag, filter, 1, false);
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
      setMarkReadError(null);
      const res = await fetch(`/api/items/${itemId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || res.statusText;

        if (res.status === 404) {
          // Item not found - remove it from local state
          setItems(prevItems => prevItems.filter(item => item.id !== itemId));
          setMarkReadError(tHome('items.errorNotFound') || "Article not found - removed from list");
          // Auto-dismiss error after 3 seconds
          setTimeout(() => setMarkReadError(null), 3000);
        } else {
          setMarkReadError(`${tHome('items.markAsReadError') || "Failed to mark as read"}: ${errorMessage}`);
        }
        console.error("Failed to mark item as read:", errorMessage);
        return;
      }

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark item as read:", error);
      setMarkReadError(tHome('items.networkError') || "Network error. Please try again.");
    }
  };

  const handleItemClick = (itemId: string) => {
    // 保存当前状态到 sessionStorage
    const stateToSave = {
      feedId: selectedFeedId,
      tag: selectedTag,
      readStatus: readStatusFilter,
      scrollPosition: window.scrollY,
      items: items
    };
    sessionStorage.setItem('feedflow_home_state', JSON.stringify(stateToSave));
  };

  const refreshAllFeeds = async () => {
    setRefreshingAll(true);
    try {
      const res = await fetch("/api/feeds/refresh-all", {
        method: "POST"
      });

      if (res.ok) {
        // 刷新完成后重新获取当前的文章列表
        await fetchItems(selectedFeedId, selectedTag, readStatusFilter, 1, false);
      } else {
        setError("刷新订阅源失败");
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh all feeds:", error);
      setError("刷新订阅源失败");
      setTimeout(() => setError(""), 5000);
    } finally {
      setRefreshingAll(false);
    }
  };

  const generateSummary = async (force: boolean = false) => {
    setSummaryLoading(true);
    setSummaryError(null);
    setStreamingContent('');
    setIsStreaming(true);

    try {
      const response = await fetch("/api/summaries/stream", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'error') {
                setSummaryError(parsed.data);
                setIsStreaming(false);
                setSummaryLoading(false);
                return;
              } else if (parsed.type === 'token') {
                fullContent += parsed.data;
                setStreamingContent(fullContent);
              } else if (parsed.type === 'done') {
                // Save the completed summary
                const saveRes = await fetch("/api/summaries/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ force, content: fullContent, itemCount: parsed.itemCount })
                });
                const saveData = await saveRes.json();
                if (saveData.summary) {
                  setSummary(saveData.summary);
                }
                setIsStreaming(false);
                setStreamingContent('');
                setSummaryLoading(false);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to stream summary:", error);
      setSummaryError("网络错误，请稍后重试");
      setIsStreaming(false);
      setStreamingContent('');
      setSummaryLoading(false);
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
          <UserMenu />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <DailySummary
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
          onRefresh={() => generateSummary(false)}
          onRegenerate={() => generateSummary(true)}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
        />

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

            <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4 mt-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFeedsExpanded(!feedsExpanded)}
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
                  onClick={refreshAllFeeds}
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
              )}
            </div>
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

              {markReadError && (
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-red-700">{markReadError}</span>
                  </div>
                  <button
                    onClick={() => setMarkReadError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="divide-y divide-theme-subtle">
                {items.length === 0 ? (
                  <div className="px-6 py-12 text-center text-theme-secondary">
                    {tHome('items.noItems')}
                  </div>
                ) : (
                  <>
                    {items.map((item) => (
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
                              onClick={() => {
                                handleItemClick(item.id);
                                if (!item.read) markAsRead(item.id);
                              }}
                              className={`text-lg font-semibold hover:underline cursor-pointer ${
                                item.read
                                  ? "text-theme-primary"
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
                    ))}
                    {loadingMore && (
                      <div className="px-6 py-8 text-center text-theme-secondary">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5 text-accent"
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
                          <span>{t('common.loading')}</span>
                        </div>
                      </div>
                    )}
                    {!hasMore && items.length > 0 && (
                      <div className="px-6 py-4 text-center text-sm text-theme-muted">
                        {tHome('items.noMoreItems') || '没有更多内容了'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
