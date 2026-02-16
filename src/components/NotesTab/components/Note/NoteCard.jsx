import React, { forwardRef, useState } from "react";
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
    handleProjectClick,
    handleJobClick,
    handleUserNameClick,
    isProjectFiltered,
    isJobFiltered,
    isUserNameFiltered, 
  } = props;

  const priorityValue = getPriorityValue(note, manuallyUpdatedPriorities);
  const isReply = isNoteReply(note.id);
  const originalNoteId = isReply ? getReplyNoteId(note.id) : null;
  const originalNoteExists = isReply && originalNoteId 
    ? isOriginalNoteExists(originalNoteId)
    : false;

  const shouldShowLink = isReply && originalNoteId && originalNoteExists;
  const [showJobTooltip, setShowJobTooltip] = useState(false);
  const [showProjectTooltip, setShowProjectTooltip] = useState(false);  

  return (
    <div
      ref={ref}  
      data-note-id={note.id}
      className={`note-card ${selectedRow === note.id ? "selected" : ""}`}
      onClick={() => handleRowClick(note)}
      onDoubleClick={() => handleEdit(note)}
    >
      {/* Rest of your NoteCard component remains the same */}
      <NoteHeader 
        note={note}
        searchTerm={searchTerm}
        userStatusMap={userStatusMap}
        loadingUsers={loadingUsers}
        handleProjectClick={handleProjectClick}
        handleJobClick={handleJobClick}
        handleUserNameClick={handleUserNameClick}
        isProjectFiltered={isProjectFiltered}
        isJobFiltered={isJobFiltered}
        isUserNameFiltered={isUserNameFiltered}
        showJobTooltip={showJobTooltip}
        setShowJobTooltip={setShowJobTooltip}
        showProjectTooltip={showProjectTooltip}
        setShowProjectTooltip={setShowProjectTooltip}
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
        onEdit={handleRowDoubleClick}
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



const NoteHeader = ({ note, searchTerm, userStatusMap, loadingUsers,
  handleProjectClick,
  handleJobClick,
  handleUserNameClick,
  isProjectFiltered,
  isJobFiltered,
  isUserNameFiltered,
  showJobTooltip,
  setShowJobTooltip,
  showProjectTooltip,
  setShowProjectTooltip }) => (
  <div className="note-header">
    <UserAvatar note={note} 
      handleUserNameClick={handleUserNameClick} 
      isUserNameFiltered={isUserNameFiltered}
      />
    <NoteMeta 
      note={note} 
      userStatusMap={userStatusMap} 
      loadingUsers={loadingUsers} 
      handleUserNameClick={handleUserNameClick} 
      isUserNameFiltered={isUserNameFiltered}
      />
    <NoteContext 
      note={note}
      searchTerm={searchTerm}
      handleProjectClick={handleProjectClick}
      handleJobClick={handleJobClick}
      isProjectFiltered={isProjectFiltered}
      isJobFiltered={isJobFiltered}
      showJobTooltip={showJobTooltip}
      setShowJobTooltip={setShowJobTooltip}
      showProjectTooltip={showProjectTooltip}
      setShowProjectTooltip={setShowProjectTooltip}
      />
  </div>
);

const UserAvatar = ({ note, handleUserNameClick, isUserNameFiltered }) => {
  const initials = getNoteInitials(note.userName);
  
  const userNameFiltered = isUserNameFiltered && typeof isUserNameFiltered === 'function' 
    ? isUserNameFiltered(note.userName) 
    : false;
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (handleUserNameClick && note.userName) {
      handleUserNameClick(note.userName);
    }
  };
  
  return (
    <div 
      className="user-avatar-wrapper"
      onClick={handleClick}
      style={{
        cursor: handleUserNameClick ? 'pointer' : 'default',
        position: 'relative'
      }}
      title={`Click to filter by user: ${note.userName || "Unknown User"}`}
    >
      <div 
        className="user-avatar"
        style={{
          border: userNameFiltered ? '2px solid #3498db' : 'none',
          boxShadow: userNameFiltered ? '0 0 0 2px rgba(52, 152, 219, 0.3)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {initials ? initials : <i className="fas fa-user" />}
      </div>
      <div className="user-tooltip">
        {note.userName || "Unknown User"}
        {userNameFiltered }
      </div>
    </div>
  );
};

const NoteMeta = ({ 
  note, 
  userStatusMap, 
  loadingUsers,
  handleUserNameClick,
  isUserNameFiltered 
}) => {
  const userNameFiltered = isUserNameFiltered && typeof isUserNameFiltered === 'function' 
    ? isUserNameFiltered(note.userName) 
    : false;
  
  const handleUserNameClickHandler = (e) => {
    e.stopPropagation();
    if (handleUserNameClick && note.userName) {
      handleUserNameClick(note.userName);
    }
  };
  
  return (
    <div className="note-meta">
      <div 
        className="note-author" 
        title={note.userName || "Unknown User"}
        onClick={handleUserNameClickHandler}
        style={{
          cursor: handleUserNameClick ? 'pointer' : 'default',
          color: userNameFiltered ? '#3498db' : 'inherit',
          fontWeight: userNameFiltered ? '600' : '700',
          textDecoration: userNameFiltered ? 'underline' : 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 4px',
          marginLeft: '-4px', 
          borderRadius: '3px',
          backgroundColor: userNameFiltered ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'all 0.2s ease'
        }}
      >
        <UserStatusIndicator
          userId={note.userId}
          userName={note.userName}
          userStatusMap={userStatusMap}
          loadingUsers={loadingUsers}
        />
        {userNameFiltered }
      </div>
      <div className="note-date" title={getFullDate(note.timeStamp)}>
        {formatRelativeTime(note.timeStamp)}
      </div>
    </div>
  );
};

const NoteContext = ({ 
  note, 
  searchTerm,
  handleProjectClick,
  handleJobClick,
  isProjectFiltered,
  isJobFiltered
}) => {
  const projectFiltered = isProjectFiltered && typeof isProjectFiltered === 'function' 
    ? isProjectFiltered(note.project) 
    : false;
  
  const jobFiltered = isJobFiltered && typeof isJobFiltered === 'function' 
    ? isJobFiltered(note.job) 
    : false;

  return (
    <div className="note-context">
      <div 
        className="context-item job"
        title={`Click to filter by job: ${note.job}`}
        onClick={(e) => {
          e.stopPropagation();
          if (handleJobClick && note.job) {
            handleJobClick(note.job);
          }
        }}
        style={{
          cursor: 'pointer',
          color: jobFiltered ? '#3498db' : 'inherit',
          fontWeight: jobFiltered ? '600' : 'normal',
          textDecoration: jobFiltered ? 'underline' : 'none'
        }}
      >
        {note.job || "—"}
      </div>
      <div className="context-item workspace-project">
        <span title={note.workspace}>{note.workspace || "—"}</span>/
        <span 
          title={`Click to filter by project: ${note.project}`}
          onClick={(e) => {
            e.stopPropagation();
            if (handleProjectClick && note.project) {
              handleProjectClick(note.project);
            }
          }}
          style={{
            cursor: 'pointer',
            fontWeight: projectFiltered ? '650' : 'normal',
            textDecoration: projectFiltered ? 'underline' : 'none'
          }}
        >
          {note.project || "—"}
        </span>
      </div>
    </div>
  );
};

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
      <ActionButton icon="fas fa-external-link-alt" title="View Note" onClick={() => onEdit(note)} />
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
  handleProjectClick: PropTypes.func,
  handleJobClick: PropTypes.func,
  handleUserNameClick: PropTypes.func, 
  isUserNameFiltered: PropTypes.func,
  isProjectFiltered: PropTypes.func,
  isJobFiltered: PropTypes.func,

};

NoteCard.defaultProps = {
  displayNotes: [],
  isOriginalNoteExists: () => false,
  selectedRow: null,
  searchTerm: "",
  viewMode: "cards",
  renderCardImageIcon: () => null,
  handleProjectClick: () => {},
  handleJobClick: () => {},
  handleUserNameClick: () => {},
  isProjectFiltered: () => false, 
  isJobFiltered: () => false,
  isUserNameFiltered: () => false, 
};

export default NoteCard;