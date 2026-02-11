import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import {
  formatRelativeTime,
  getFullDate,
} from "../../utils/formatUtils";
import {
  highlightHtmlContent,
} from "../../utils/htmlUtils";
import {
  getNoteInitials,
} from "../../utils/noteUtils";
import PriorityIndicator from "./PriorityIndicator";
import UserStatusIndicator from "../Tooltips/UserStatusIndicator";

const NoteCard = forwardRef((props, ref) => {
  const {
    note,
    displayNotes, 
    isOriginalNoteExists,
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
    shouldShowNotePopup,
  } = props;

  const priorityValue = getPriorityValue(note, manuallyUpdatedPriorities);
  const isReply = isNoteReply(note.id);
  const originalNoteId = isReply ? getReplyNoteId(note.id) : null;

  const originalNoteExists = isReply && originalNoteId 
    ? isOriginalNoteExists(originalNoteId)
    : false;

  const shouldShowLink = isReply && originalNoteId && originalNoteExists;

  return (
    <div
      ref={ref}  
      data-note-id={note.id}
      className={`note-card ${selectedRow === note.id ? "selected" : ""}`}
      onClick={() => handleRowClick(note)}
      onDoubleClick={() => handleRowDoubleClick(note)}
    >
      {/* Rest of your NoteCard component remains the same */}
      <NoteHeader 
        note={note}
        searchTerm={searchTerm}
        userStatusMap={userStatusMap}
        loadingUsers={loadingUsers}
      />
      
      <NoteContent
        note={note}
        searchTerm={searchTerm}
        viewMode={viewMode}
        onMouseEnter={handleNoteTextMouseEnter}
        onMouseLeave={handleNoteTextMouseLeave}
        shouldShowNotePopup={shouldShowNotePopup}
      />
      
      <NoteFooter
        note={note}
        priorityValue={priorityValue}
        shouldShowLink={shouldShowLink} 
        originalNoteId={originalNoteId}
        onViewAttachments={handleViewAttachments}
        onReply={handleReplyToNote}
        onAdd={handleAddFromRow}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPriorityClick={handlePriorityClick}
        onPriorityMouseEnter={handlePriorityMouseEnter}
        onPriorityMouseLeave={handlePriorityMouseLeave}
        onLinkedNoteClick={handleLinkedNoteClick}
        onLinkedNoteMouseEnter={handleLinkedNoteMouseEnter}
        onLinkedNoteMouseLeave={handleLinkedNoteMouseLeave}
        renderImageIcon={renderCardImageIcon}
      />
    </div>
  );
});



const NoteHeader = ({ note, searchTerm, userStatusMap, loadingUsers }) => (
  <div className="note-header">
    <UserAvatar note={note} />
    <NoteMeta note={note} userStatusMap={userStatusMap} loadingUsers={loadingUsers} />
    <NoteContext note={note} searchTerm={searchTerm} />
  </div>
);

const UserAvatar = ({ note }) => {
  const initials = getNoteInitials(note.userName);
  
  return (
    <div className="user-avatar-wrapper">
      <div className="user-avatar">
        {initials ? initials : <i className="fas fa-user" />}
      </div>
      <div className="user-tooltip">{note.userName || "Unknown User"}</div>
    </div>
  );
};

const NoteMeta = ({ note, userStatusMap, loadingUsers }) => (
  <div className="note-meta">
    <div className="note-author" title={note.userName || "Unknown User"}>
      <UserStatusIndicator
        userId={note.userId}
        userName={note.userName}
        userStatusMap={userStatusMap}
        loadingUsers={loadingUsers}
      />
    </div>
    <div className="note-date" title={getFullDate(note.timeStamp)}>
      {formatRelativeTime(note.timeStamp)}
    </div>
  </div>
);

const NoteContext = ({ note, searchTerm }) => (
  <div className="note-context">
    <div className="context-item job" title={note.job}>
      {note.job || "—"}
    </div>
    <div className="context-item workspace-project">
      <span title={note.workspace}>{note.workspace || "—"}</span>/
      <span title={note.project}>{note.project || "—"}</span>
    </div>
  </div>
);

const NoteContent = ({ note, searchTerm, viewMode, onMouseEnter, onMouseLeave, shouldShowNotePopup }) => {
  // Check if shouldShowNotePopup is a function before calling it
  const handleMouseEnter = (e) => {
    if (typeof shouldShowNotePopup === 'function' && shouldShowNotePopup(note)) {
      onMouseEnter(note, e);
    }
  };

  const handleMouseLeave = () => {
    if (typeof shouldShowNotePopup === 'function' && shouldShowNotePopup(note)) {
      onMouseLeave();
    }
  };

  return (
    <div className="note-content">
      <div
        className="note-card-content-container"
        style={{ position: "relative", height: "100%" }}
        onClick={(e) => {
          if (e.target.tagName === "A" && e.target.classList.contains("note-url-link")) {
            e.stopPropagation();
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="note-text"
          style={{ maxHeight: "110px", overflow: "hidden", position: "relative" }}
          dangerouslySetInnerHTML={{
            __html: highlightHtmlContent(note.note || "", searchTerm),
          }}
        />
      </div>
    </div>
  );
};

const NoteFooter = ({
  note,
  priorityValue,
  shouldShowLink,
  originalNoteId,
  onViewAttachments,
  onReply,
  onAdd,
  onEdit,
  onDelete,
  onPriorityClick,
  onPriorityMouseEnter,
  onPriorityMouseLeave,
  onLinkedNoteClick,
  onLinkedNoteMouseEnter,
  onLinkedNoteMouseLeave,
  renderImageIcon,
}) => (
  <div className="note-footer">
    <div className="note-attachments" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {renderImageIcon && renderImageIcon(note)}
      <AttachmentButton note={note} onClick={onViewAttachments} />
      <ReplyButton note={note} onClick={onReply} />
      {shouldShowLink && originalNoteId && ( // Conditionally render based on shouldShowLink
        <LinkButton
          noteId={note.id}
          onClick={onLinkedNoteClick}
          onMouseEnter={onLinkedNoteMouseEnter}
          onMouseLeave={onLinkedNoteMouseLeave}
        />
      )}
    </div>
    <div className="note-actions">
      <PriorityIndicator
        priorityValue={priorityValue}
        note={note}
        onClick={onPriorityClick}
        onMouseEnter={onPriorityMouseEnter}
        onMouseLeave={onPriorityMouseLeave}
      />
      <ActionButton icon="fas fa-plus" title="Add New Note" onClick={() => onAdd(note)} />
      <ActionButton icon="fas fa-edit" title="Edit Note" onClick={() => onEdit(note)} />
      <ActionButton icon="fas fa-trash" title="Delete Note" onClick={() => onDelete(note)} />
    </div>
  </div>
);

const AttachmentButton = ({ note, onClick }) => (
  <button 
    className="attachment-btn" 
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(note); 
    }}
  >
    <i 
      className="fas fa-paperclip" 
      style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }} 
    />
    <span>({note.documentCount || 0})</span>
  </button>
);

const ReplyButton = ({note, onClick }) => (
  <button
    className="attachment-btn"
    style={{ 
      padding: "4px 8px", 
      background: "transparent", 
      border: "none", 
      cursor: "pointer", 
      color: "#3498db" 
    }}
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(note); 
    }}
    title="Reply to this note"
  >
    <i className="fas fa-reply" />
  </button>
);

const LinkButton = ({ noteId, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    className="link-to-note-btn"
    onClick={(e) => onClick(noteId, e)}
    onMouseEnter={(e) => onMouseEnter(noteId, e)}
    onMouseLeave={onMouseLeave}
    style={{
      background: "none",
      border: "1px solid #3498db",
      color: "#3498db",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "12px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      transition: "all 0.2s ease",
    }}
  >
    <i className="fas fa-link" />
  </button>
);

const ActionButton = ({ icon, title, onClick }) => (
  <button 
    className="action-btn" 
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(); 
    }} 
    title={title}
  >
    <i className={icon} />
  </button>
);

NoteCard.propTypes = {
  note: PropTypes.object.isRequired,
  displayNotes: PropTypes.array, 
  isOriginalNoteExists: PropTypes.func,
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
  shouldShowNotePopup: PropTypes.func.isRequired,
};

NoteCard.defaultProps = {
  displayNotes: [],
  isOriginalNoteExists: () => false,
  selectedRow: null,
  searchTerm: "",
  viewMode: "cards",
  renderCardImageIcon: () => null,
};

export default NoteCard;