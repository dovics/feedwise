"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Feed } from "@/types/feed";
import { Item } from "@/types/item";

type ReadStatusFilter = "all" | "read" | "unread";

interface UseFeedActionsProps {
  state: any;
  updateState: (updates: any) => void;
  fetchItems: (
    feedId?: string | null,
    tag?: string | null,
    readStatus?: ReadStatusFilter,
    pageNum?: number,
    append?: boolean
  ) => Promise<void>;
  fetchFeeds: () => Promise<void>;
}

export function useFeedActions({
  state,
  updateState,
  fetchItems,
  fetchFeeds,
}: UseFeedActionsProps) {
  const tHome = useTranslations('home');

  const addFeed = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    updateState({ loading: true, error: "" });

    if (!state.newFeedUrl.trim()) {
      updateState({
        error: tHome('addFeed.error.required'),
        loading: false,
      });
      return;
    }

    if (!state.newFeedUrl.startsWith('http://') && !state.newFeedUrl.startsWith('https://')) {
      updateState({
        error: tHome('addFeed.error.invalidUrl'),
        loading: false,
      });
      return;
    }

    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.newFeedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        updateState({ error: data.error || "Failed to add feed" });
        return;
      }

      updateState({ newFeedUrl: "" });
      await fetchFeeds();
      await fetchItems(state.selectedFeedId, state.selectedTag, state.readStatusFilter);
    } catch (error) {
      updateState({ error: tHome('addFeed.error.networkError') });
    } finally {
      updateState({ loading: false });
    }
  }, [state.newFeedUrl, state.selectedFeedId, state.selectedTag, state.readStatusFilter, fetchFeeds, fetchItems, updateState, tHome]);

  const refreshFeed = useCallback(async (feedId: string) => {
    updateState({ refreshing: feedId });
    try {
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: "POST"
      });

      if (res.ok) {
        await fetchFeeds();
        await fetchItems(state.selectedFeedId, state.selectedTag, state.readStatusFilter);
      } else {
        const data = await res.json();
        const errorMessage = `${tHome('feeds.refreshing')}: ${data.error || tHome('errors.unknown')}`;
        updateState({ error: errorMessage });
        setTimeout(() => updateState({ error: "" }), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      const errorMessage = `${tHome('feeds.refresh')}: ${tHome('errors.network')}`;
      updateState({ error: errorMessage });
      setTimeout(() => updateState({ error: "" }), 5000);
    } finally {
      updateState({ refreshing: null });
    }
  }, [fetchFeeds, fetchItems, state.selectedFeedId, state.selectedTag, state.readStatusFilter, updateState, tHome]);

  const deleteFeed = useCallback(async (feedId: string) => {
    const confirmed = confirm(tHome('feeds.deleteConfirm') || "确定要取消订阅这个 RSS 源吗？");
    if (!confirmed) return;

    try {
      updateState({ deletingFeed: feedId });
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        updateState({ error: data.error || tHome('errors.unknown') });
        return;
      }

      if (state.selectedFeedId === feedId) {
        updateState({ selectedFeedId: null });
        await fetchItems(undefined, state.selectedTag, state.readStatusFilter);
      }

      await fetchFeeds();
      updateState({ error: "" });
    } catch (error) {
      updateState({ error: tHome('errors.network') });
    } finally {
      updateState({ deletingFeed: null });
    }
  }, [state.selectedFeedId, state.selectedTag, state.readStatusFilter, fetchFeeds, fetchItems, updateState, tHome]);

  const autoCategorizeFeed = useCallback(async (feedId: string) => {
    updateState({ autoCategorizing: feedId });
    try {
      const res = await fetch(`/api/feeds/${feedId}/auto-categorize`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        updateState({ error: data.message || "标签已自动更新" });
        setTimeout(() => updateState({ error: "" }), 3000);
        await fetchFeeds();
      } else {
        const data = await res.json();
        updateState({ error: data.error || "自动分类失败" });
        setTimeout(() => updateState({ error: "" }), 5000);
      }
    } catch (error) {
      console.error("Failed to auto-categorize feed:", error);
      updateState({ error: "自动分类失败" });
      setTimeout(() => updateState({ error: "" }), 5000);
    } finally {
      updateState({ autoCategorizing: null });
    }
  }, [fetchFeeds, updateState]);

  const refreshAllFeeds = useCallback(async () => {
    updateState({ refreshingAll: true });
    try {
      const res = await fetch("/api/feeds/refresh-all", {
        method: "POST"
      });

      if (res.ok) {
        await fetchItems(state.selectedFeedId, state.selectedTag, state.readStatusFilter, 1, false);
      } else {
        updateState({ error: "刷新订阅源失败" });
        setTimeout(() => updateState({ error: "" }), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh all feeds:", error);
      updateState({ error: "刷新订阅源失败" });
      setTimeout(() => updateState({ error: "" }), 5000);
    } finally {
      updateState({ refreshingAll: false });
    }
  }, [fetchItems, state.selectedFeedId, state.selectedTag, state.readStatusFilter, updateState]);

  const markAllAsRead = useCallback(async () => {
    updateState({ markingAllRead: true });
    try {
      const body: any = {};
      if (state.selectedFeedId) body.feedId = state.selectedFeedId;
      if (state.selectedTag) body.tag = state.selectedTag;

      const res = await fetch("/api/items/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        updateState({
          items: state.items.map((item: Item) => {
            if (state.selectedFeedId && item.feed.id !== state.selectedFeedId) {
              return item;
            }
            if (state.selectedTag && !item.feed.tags?.includes(state.selectedTag)) {
              return item;
            }
            return item.read ? item : { ...item, read: true };
          })
        });
      } else {
        const data = await res.json();
        updateState({ error: data.error || "批量标记已读失败" });
        setTimeout(() => updateState({ error: "" }), 5000);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      updateState({ error: "批量标记已读失败" });
      setTimeout(() => updateState({ error: "" }), 5000);
    } finally {
      updateState({ markingAllRead: false });
    }
  }, [state.items, state.selectedFeedId, state.selectedTag, updateState]);

  const markAsRead = useCallback(async (itemId: string, setMarkReadError?: (error: string | null) => void) => {
    try {
      if (setMarkReadError) setMarkReadError(null);

      const res = await fetch(`/api/items/${itemId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || res.statusText;

        if (res.status === 404) {
          updateState({
            items: state.items.filter((item: Item) => item.id !== itemId)
          });
          if (setMarkReadError) {
            setMarkReadError(tHome('items.errorNotFound') || "Article not found - removed from list");
            setTimeout(() => setMarkReadError(null), 3000);
          }
        } else {
          if (setMarkReadError) {
            setMarkReadError(`${tHome('items.markAsReadError') || "Failed to mark as read"}: ${errorMessage}`);
            setTimeout(() => setMarkReadError(null), 3000);
          }
        }
        console.error("Failed to mark item as read:", errorMessage);
        return;
      }

      updateState({
        items: state.items.map((item: Item) =>
          item.id === itemId ? { ...item, read: true } : item
        )
      });
    } catch (error) {
      console.error("Failed to mark item as read:", error);
      if (setMarkReadError) {
        setMarkReadError(tHome('items.networkError') || "Network error. Please try again.");
        setTimeout(() => setMarkReadError(null), 3000);
      }
    }
  }, [state.items, updateState, tHome]);

  return {
    addFeed,
    refreshFeed,
    deleteFeed,
    autoCategorizeFeed,
    refreshAllFeeds,
    markAllAsRead,
    markAsRead,
  };
}
