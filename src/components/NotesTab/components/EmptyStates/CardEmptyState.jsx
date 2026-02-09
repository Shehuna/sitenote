import React from "react";
import PropTypes from "prop-types";

const CardEmptyState = ({ searchTerm, hasActiveFilters, isDataLoaded, isLoading }) => {
  if (!isDataLoaded || isLoading) return null;

  return (
    <div
      className="empty-state"
      style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}
    >
      <i
        className="fas fa-search"
        style={{
          fontSize: 28,
          marginBottom: 12,
          display: "block",
          opacity: 0.5,
        }}
      />
      <h3>
        {searchTerm
          ? "No notes match your search"
          : hasActiveFilters
            ? "No notes match your filters"
            : "No notes available"}
      </h3>
      <p>
        {searchTerm
          ? "Try adjusting your search terms"
          : hasActiveFilters
            ? "Try clearing some filters"
            : "Create your first note to get started"}
      </p>
    </div>
  );
};

CardEmptyState.propTypes = {
  searchTerm: PropTypes.string,
  hasActiveFilters: PropTypes.bool,
  isDataLoaded: PropTypes.bool,
  isLoading: PropTypes.bool,
};

CardEmptyState.defaultProps = {
  searchTerm: "",
  hasActiveFilters: false,
  isDataLoaded: true,
  isLoading: false,
};

export default CardEmptyState;