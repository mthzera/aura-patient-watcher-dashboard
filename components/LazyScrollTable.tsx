"use client";

import type { RefObject, ReactNode } from "react";

interface ScrollTableProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  maxHeightClass?: string;
}

/** Scrollable container for large tables — sticky header lives inside `children`. */
export function ScrollTable({
  scrollRef,
  children,
  className = "",
  maxHeightClass = "max-h-[min(420px,55vh)]",
}: ScrollTableProps) {
  return (
    <div
      ref={scrollRef}
      className={`${maxHeightClass} overflow-y-auto overflow-x-auto overscroll-contain rounded-lg border border-slate-700/60 ${className}`}
    >
      {children}
    </div>
  );
}

interface LazyLoadFooterProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function LazyLoadFooter({
  visibleCount,
  totalCount,
  hasMore,
  onLoadMore,
}: LazyLoadFooterProps) {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/50 px-3 py-2">
      <span className="text-[10px] text-slate-500 tabular-nums">
        Exibindo {Math.min(visibleCount, totalCount)} de {totalCount}
      </span>
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700 transition"
        >
          Carregar mais
        </button>
      ) : (
        <span className="text-[10px] text-slate-600">Fim da lista</span>
      )}
    </div>
  );
}

/** Sticky table header row classes shared across dashboard tables. */
export const STICKY_TABLE_HEAD =
  "sticky top-0 z-10 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm text-left";
