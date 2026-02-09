import React from "react";

const CardSkeleton = ({ cards = 8 }) => {
  return [...Array(cards)].map((_, i) => (
    <div key={`card-skeleton-${i}`} className="note-card skeleton">
      <div className="skeleton-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-text short" />
      </div>
      <div className="skeleton-content">
        <div className="skeleton-text long" />
        <div className="skeleton-text medium" />
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-actions" />
      </div>
    </div>
  ));
};

export default CardSkeleton;