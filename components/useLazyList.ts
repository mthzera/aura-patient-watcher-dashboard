"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_BATCH = 30;

export function useLazyList<T>(items: T[], batchSize = DEFAULT_BATCH) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(batchSize);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [items, batchSize]);

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + batchSize, items.length));
  }, [batchSize, items.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root, rootMargin: "160px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, visibleCount, items.length]);

  return {
    scrollRef,
    sentinelRef,
    visibleItems: items.slice(0, visibleCount),
    visibleCount,
    totalCount: items.length,
    hasMore: visibleCount < items.length,
    loadMore,
  };
}
