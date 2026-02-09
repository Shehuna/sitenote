import React from "react";
import PropTypes from "prop-types";
import { NoteCard } from "../Note";
import { CardSkeleton } from "../Skeleton";
import { CardEmptyState } from "../EmptyStates";

const CardView = ({
  displayNotes,
  isLoading,
  selectedRow,
  searchTerm,
  viewMode,
  handleRowClick,
  handleRowDoubleClick,
  handleAddFromRow,
  handleEdit,
  handleDelete,
  handleViewAttachments,
  handleReplyToNote,
  handlePriorityClick,
  handlePriorityMouseEnter,
  handlePriorityMouseLeave,
  handleNoteTextMouseEnter,
  handleNoteTextMouseLeave,
  handleLinkedNoteClick,
  handleLinkedNoteMouseEnter,
  handleLinkedNoteMouseLeave,
  renderCardImageIcon,
  isNoteReply,
  getReplyNoteId,
  userStatusMap,
  loadingUsers,
  getPriorityValue,
  manuallyUpdatedPriorities,
  loadingMore,
  hasMore,
  hasActiveFilters,
  lastCardRef,
  shouldShowNotePopup,
}) => {
  if (isLoading) {
    return (
      <div className="notes-grid">
        <CardSkeleton />
      </div>
    );
  }

  if (displayNotes.length === 0) {
    return (
      <div className="notes-grid">
        <CardEmptyState 
          searchTerm={searchTerm} 
          hasActiveFilters={hasActiveFilters} 
        />
      </div>
    );
  }

  return (
    <div className="notes-grid">
      {displayNotes.map((note, index) => (
        <NoteCard
          key={`${note.id}-${index}`}
          note={note}
          selectedRow={selectedRow}
          searchTerm={searchTerm}
          viewMode={viewMode}
          handleRowClick={handleRowClick}
          handleRowDoubleClick={handleRowDoubleClick}
          handleAddFromRow={handleAddFromRow}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleViewAttachments={handleViewAttachments}
          handleReplyToNote={handleReplyToNote}
          handlePriorityClick={handlePriorityClick}
          handlePriorityMouseEnter={handlePriorityMouseEnter}
          handlePriorityMouseLeave={handlePriorityMouseLeave}
          handleNoteTextMouseEnter={handleNoteTextMouseEnter}
          handleNoteTextMouseLeave={handleNoteTextMouseLeave}
          handleLinkedNoteClick={handleLinkedNoteClick}
          handleLinkedNoteMouseEnter={handleLinkedNoteMouseEnter}
          handleLinkedNoteMouseLeave={handleLinkedNoteMouseLeave}
          renderCardImageIcon={renderCardImageIcon}
          isNoteReply={isNoteReply}
          getReplyNoteId={getReplyNoteId}
          userStatusMap={userStatusMap}
          loadingUsers={loadingUsers}
          getPriorityValue={getPriorityValue}
          manuallyUpdatedPriorities={manuallyUpdatedPriorities}
          shouldShowNotePopup={shouldShowNotePopup}
          ref={index === displayNotes.length - 1 ? lastCardRef : null}
        />
      ))}
      
      {renderLoadingMore(loadingMore)}
      {renderNoMoreNotes(hasMore, displayNotes.length, loadingMore, hasActiveFilters, searchTerm)}
    </div>
  );
};

const renderLoadingMore = (loadingMore) => {
  if (!loadingMore) return null;
  
  return (
    <div className="loading-more-cards">
      <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }} />
     
    </div>
  );
};

const renderNoMoreNotes = (hasMore, noteCount, loadingMore, hasActiveFilters, searchTerm) => {
  if (hasMore || noteCount === 0 || loadingMore || hasActiveFilters || searchTerm.trim()) {
    return null;
  }
  
  return (
    <div
      className="no-more-notes"
      style={{
        gridColumn: "1 / -1",
        textAlign: "center",
        padding: "8px",
        color: "#666",
        fontStyle: "italic",
        borderRadius: "8px",
        margin: "5px 0",
      }}
    >
      <i className="fas fa-check-circle" style={{ marginRight: "8px", color: "#75a0f5ff" }} />
      No more notes to load
    </div>
  );
};

CardView.propTypes = {
  displayNotes: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  selectedRow: PropTypes.any,
  searchTerm: PropTypes.string,
  viewMode: PropTypes.string,
  handleRowClick: PropTypes.func.isRequired,
  handleRowDoubleClick: PropTypes.func.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  handleReplyToNote: PropTypes.func.isRequired,
  handlePriorityClick: PropTypes.func.isRequired,
  handlePriorityMouseEnter: PropTypes.func.isRequired,
  handlePriorityMouseLeave: PropTypes.func.isRequired,
  handleNoteTextMouseEnter: PropTypes.func.isRequired,
  handleNoteTextMouseLeave: PropTypes.func.isRequired,
  handleLinkedNoteClick: PropTypes.func.isRequired,
  handleLinkedNoteMouseEnter: PropTypes.func.isRequired,
  handleLinkedNoteMouseLeave: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func,
  isNoteReply: PropTypes.func.isRequired,
  getReplyNoteId: PropTypes.func.isRequired,
  userStatusMap: PropTypes.object.isRequired,
  loadingUsers: PropTypes.object.isRequired,
  getPriorityValue: PropTypes.func.isRequired,
  manuallyUpdatedPriorities: PropTypes.object.isRequired,
  loadingMore: PropTypes.bool,
  hasMore: PropTypes.bool,
  hasActiveFilters: PropTypes.bool,
  lastCardRef: PropTypes.object,
  shouldShowNotePopup: PropTypes.func.isRequired, // Fixed: Added isRequired
};

CardView.defaultProps = {
  selectedRow: null,
  searchTerm: "",
  viewMode: "cards",
  renderCardImageIcon: () => null,
  loadingMore: false,
  hasMore: true,
  hasActiveFilters: false,
  lastCardRef: null,
  shouldShowNotePopup: () => false, // Added default function
};

export default CardView;