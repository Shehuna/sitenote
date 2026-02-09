import React from "react";
import PropTypes from "prop-types";

const TableEmptyState = ({ searchTerm, hasActiveFilters, isDataLoaded, isLoading }) => {
  if (!isDataLoaded || isLoading) return null;

  return (
    <tr>
      <td
        colSpan={8}
        style={{ textAlign: "center", padding: 40, color: "#999" }}
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
        <div>
          {searchTerm
            ? "No notes match your search"
            : hasActiveFilters
              ? "No notes match your filters"
              : "No notes available"}
        </div>
      </td>
    </tr>
  );
};

TableEmptyState.propTypes = {
  searchTerm: PropTypes.string,
  hasActiveFilters: PropTypes.bool,
  isDataLoaded: PropTypes.bool,
  isLoading: PropTypes.bool,
};

TableEmptyState.defaultProps = {
  searchTerm: "",
  hasActiveFilters: false,
  isDataLoaded: true,
  isLoading: false,
};

export default TableEmptyState;