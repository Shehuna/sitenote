import { useState, useEffect, useRef } from "react";

export const useStackedView = ({ viewMode, hasActiveFilters }) => {
  const [isStackedViewLoading, setIsStackedViewLoading] = useState(false);
  const [isFilteringStacked, setIsFilteringStacked] = useState(false);
  const viewModeRef = useRef(viewMode);
  const hasActiveFiltersRef = useRef(hasActiveFilters);

  // Track view mode changes
  useEffect(() => {
    if (viewModeRef.current !== viewMode && viewMode === "stacked") {
      setIsStackedViewLoading(true);
      const timer = setTimeout(() => {
        setIsStackedViewLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Track filter changes in stacked view
  useEffect(() => {
    if (
      viewMode === "stacked" &&
      hasActiveFiltersRef.current !== hasActiveFilters
    ) {
      setIsFilteringStacked(true);
      const timer = setTimeout(() => {
        setIsFilteringStacked(false);
      }, 500);

      return () => clearTimeout(timer);
    }
    hasActiveFiltersRef.current = hasActiveFilters;
  }, [hasActiveFilters, viewMode]);

  return {
    isStackedViewLoading,
    isFilteringStacked,
  };
};