import React from "react";

const TableSkeleton = ({ rows = 5 }) => {
  return [...Array(rows)].map((_, i) => (
    <tr key={`skeleton-${i}`}>
      <td colSpan={8}>
        <div className="skeleton-row">
          <div className="skeleton-cell short" />
          <div className="skeleton-cell medium" />
          <div className="skeleton-cell medium" />
          <div className="skeleton-cell medium" />
          <div className="skeleton-cell long" />
          <div className="skeleton-cell short" />
          <div className="skeleton-cell short" />
          <div className="skeleton-cell short" />
        </div>
      </td>
    </tr>
  ));
};

export default TableSkeleton;