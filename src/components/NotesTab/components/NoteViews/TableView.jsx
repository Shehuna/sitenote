import React from "react";
import PropTypes from "prop-types";
import { NoteRow } from "../Note";
import { TableSkeleton } from "../Skeleton";
import { TableEmptyState } from "../EmptyStates";

const TableView = ({
  displayNotes,
  isLoading,
  selectedRow,
  searchTerm,
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
  renderTableImageIcon,
  isNoteReply,
  getReplyNoteId,
  isOriginalNoteExists,
  userStatusMap,
  loadingUsers,
  getPriorityValue,
  manuallyUpdatedPriorities,
  loadingMore,
  hasMore,
  hasActiveFilters,
  lastRowRef,
  jobs,
  setViewNote,
  setShowViewModal,
  focusedRow,
}) => {
  if (isLoading) {
    return (
      <div className="responsive-table-container">
        <table>
          <thead>
            <tr>
              {getTableHeaders().map((header) => (
                <th key={header.key} className="filterable-column">
                  {header.icon} {header.label}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableSkeleton />
          </tbody>
        </table>
      </div>
    );
  }

  if (displayNotes.length === 0) {
    return (
      <div className="responsive-table-container">
        <table>
          <thead>
            <tr>
              {getTableHeaders().map((header) => (
                <th key={header.key} className="filterable-column">
                  {header.icon} {header.label}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableEmptyState searchTerm={searchTerm} hasActiveFilters={hasActiveFilters} />
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="responsive-table-container">
      <table>
        <thead>
          <tr>
            {getTableHeaders().map((header) => (
              <th key={header.key} className="filterable-column">
                {header.icon} {header.label}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayNotes.map((note, index) => (
            <NoteRow
              key={`${note.id}-${index}`}
              note={note}
              index={index}
              isLast={index === displayNotes.length - 1}
              selectedRow={selectedRow}
              searchTerm={searchTerm}
              handleRowClick={handleRowClick}
              handleRowDoubleClick={() => {
                handleRowDoubleClick(note);
                const job = jobs.find(
                  (j) => String(j.id) === String(note.job) || j.name === note.job,
                );
                setViewNote({
                  id: note.id,
                  jobId: job?.id ?? null,
                });
                setShowViewModal(true);
              }}
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
              renderTableImageIcon={renderTableImageIcon}
              isNoteReply={isNoteReply}
              getReplyNoteId={getReplyNoteId}
              isOriginalNoteExists={isOriginalNoteExists}
              userStatusMap={userStatusMap}
              loadingUsers={loadingUsers}
              getPriorityValue={getPriorityValue}
              manuallyUpdatedPriorities={manuallyUpdatedPriorities}
              focusedRow={focusedRow}
              ref={index === displayNotes.length - 1 ? lastRowRef : null}
            />
          ))}
          
          {renderLoadingMore(loadingMore)}
          {renderNoMoreNotes(hasMore, displayNotes.length, loadingMore, hasActiveFilters, searchTerm)}
        </tbody>
      </table>
    </div>
  );
};

const getTableHeaders = () => [
  { key: "date", label: "Date", icon: <i className="fas fa-calendar" /> },
  { key: "workspace", label: "Workspace", icon: <i className="fas fa-building" /> },
  { key: "project", label: "Project", icon: <i className="fas fa-project-diagram" /> },
  { key: "job", label: "Job", icon: <i className="fas fa-tasks" /> },
  { key: "note", label: "Note", icon: <i className="fas fa-sticky-note" /> },
  { key: "userName", label: "User Name", icon: <i className="fas fa-user" /> },
  { key: "attachedFiles", label: "Attached Files", icon: <i className="fas fa-paperclip" /> },
];

const renderLoadingMore = (loadingMore) => {
  if (!loadingMore) return null;
  
  return (
    <tr>
      <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
        <div className="loading-more">
          <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }} />
          Loading more notes...
        </div>
      </td>
    </tr>
  );
};

const renderNoMoreNotes = (hasMore, noteCount, loadingMore, hasActiveFilters, searchTerm) => {
  if (hasMore || noteCount === 0 || loadingMore || hasActiveFilters || searchTerm.trim()) {
    return null;
  }
  
  return (
    <tr>
      <td colSpan={8} style={{ textAlign: "center", padding: "10px", color: "#666", fontStyle: "italic" }}>
        <i className="fas fa-check-circle" style={{ marginRight: "8px", color: "#75a0f5ff" }} />
        No more notes to load
      </td>
    </tr>
  );
};

TableView.propTypes = {
  displayNotes: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  selectedRow: PropTypes.any,
  searchTerm: PropTypes.string,
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
  renderTableImageIcon: PropTypes.func,
  isNoteReply: PropTypes.func.isRequired,
  getReplyNoteId: PropTypes.func.isRequired,
  isOriginalNoteExists: PropTypes.func.isRequired,
  userStatusMap: PropTypes.object.isRequired,
  loadingUsers: PropTypes.object.isRequired,
  getPriorityValue: PropTypes.func.isRequired,
  manuallyUpdatedPriorities: PropTypes.object.isRequired,
  loadingMore: PropTypes.bool,
  hasMore: PropTypes.bool,
  hasActiveFilters: PropTypes.bool,
  lastRowRef: PropTypes.object,
  jobs: PropTypes.array.isRequired,
  setViewNote: PropTypes.func.isRequired,
  setShowViewModal: PropTypes.func.isRequired,
  focusedRow: PropTypes.any,
};

TableView.defaultProps = {
  selectedRow: null,
  searchTerm: "",
  renderTableImageIcon: () => null,
  loadingMore: false,
  hasMore: true,
  hasActiveFilters: false,
  lastRowRef: null,
  focusedRow: null,
  isOriginalNoteExists: () => false,
};

export default TableView;