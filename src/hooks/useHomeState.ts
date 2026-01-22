"use client";

import { useCallback, useState } from "react";
import { Item } from "@/types/item";
import { Feed } from "@/types/feed";

type ReadStatusFilter = "all" | "read" | "unread";

interface HomeState {
  feeds: Feed[];
  selectedFeedId: string | null;
  selectedTag: string | null;
  readStatusFilter: ReadStatusFilter;
  items: Item[];
  newFeedUrl: string;
  loading: boolean;
  error: string;
  refreshing: string | null;
  deletingFeed: string | null;
  autoCategorizing: string | null;
  markingAllRead: boolean;
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
  autoRefreshed: boolean;
  feedsExpanded: boolean;
  refreshingAll: boolean;
}

export function useHomeState() {
  const [state, setState] = useState<HomeState>({
    feeds: [],
    selectedFeedId: null,
    selectedTag: null,
    readStatusFilter: "unread",
    items: [],
    newFeedUrl: "",
    loading: false,
    error: "",
    refreshing: null,
    deletingFeed: null,
    autoCategorizing: null,
    markingAllRead: false,
    page: 1,
    hasMore: true,
    loadingMore: false,
    autoRefreshed: false,
    feedsExpanded: true,
    refreshingAll: false,
  });

  const updateState = useCallback((updates: Partial<HomeState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    state,
    updateState,
  };
}
