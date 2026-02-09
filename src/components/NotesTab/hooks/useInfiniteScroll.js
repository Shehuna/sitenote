import { useRef, useEffect, useCallback } from "react";

export const useInfiniteScroll = ({
  viewMode,
  hasMore,
  loadingMore,
  hasActiveFilters,
  searchTerm,
  loadMoreNotes,
  displayNotes,
}) => {
  const observerRef = useRef(null);
  const lastRowRef = useRef(null);
  const lastCardRef = useRef(null);
  const loadingRef = useRef(false);

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (hasActiveFilters || searchTerm.trim() || !hasMore || loadingMore) {
      return;
    }

    let targetElement = null;
    if (viewMode === "table" && lastRowRef.current) {
      targetElement = lastRowRef.current;
    } else if (viewMode === "cards" && lastCardRef.current) {
      targetElement = lastCardRef.current;
    }

    if (!targetElement) return;

    const options = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasMore &&
        !loadingMore &&
        !loadingRef.current
      ) {
        loadMoreNotes();
      }
    }, options);

    observer.observe(targetElement);
    observerRef.current = observer;
  }, [
    viewMode,
    hasMore,
    loadingMore,
    hasActiveFilters,
    searchTerm,
    loadMoreNotes,
  ]);

  useEffect(() => {
    setupObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setupObserver();
    }, 100);

    return () => clearTimeout(timer);
  }, [displayNotes, setupObserver]);

  return {
    lastRowRef,
    lastCardRef,
    loadingRef,
  };
};