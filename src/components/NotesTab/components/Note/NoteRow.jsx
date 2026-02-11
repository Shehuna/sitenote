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
  shouldShowNotePopup,
} from "../../utils/noteHelpers";
import PriorityIndicator from "./PriorityIndicator";
import UserStatusIndicator from "../Tooltips/UserStatusIndicator";

const NoteRow = forwardRef(({
  note,
  index,
  isLast,
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
  focusedRow,
}, ref) => {
  const priorityValue = getPriorityValue(note, manuallyUpdatedPriorities);
  const isReply = isNoteReply(note.id);
  const originalNoteId = isReply ? getReplyNoteId(note.id) : null;

  const originalNoteExists = isReply && originalNoteId 
    ? isOriginalNoteExists(originalNoteId)
    : false;

  const shouldShowLink = isReply && originalNoteId && originalNoteExists;
  const isInactive = userStatusMap[note.userId] && !userStatusMap[note.userId].active;

  return (
    <tr
      ref={isLast ? ref : null}
      data-note-id={note.id}
      onClick={() => handleRowClick(note)}
      onDoubleClick={() => handleRowDoubleClick(note)}
      className={`${selectedRow === note.id ? "selected-row" : ""} ${
        focusedRow === note.id ? "focused-row" : ""
      }`}
      style={{ cursor: "pointer" }}
    >
      <td title={getFullDate(note.timeStamp)}>
        {formatRelativeTime(note.timeStamp)}
      </td>
      <td>{note.workspace || "—"}</td>
      <td>{note.project || "—"}</td>
      <td>{note.job || "—"}</td>
      <td
        className="editable"
        style={{ position: "relative", maxWidth: "300px" }}
      >
        <div
          className="note-cell-container"
          style={{
            display: "flex",
            alignItems: "flex-start",
            position: "relative",
            maxWidth: "100%",
            cursor: "default",
          }}
          onClick={(e) => {
            if (
              e.target.tagName === "A" &&
              e.target.classList.contains("note-url-link")
            ) {
              e.stopPropagation();
            }
          }}
          onMouseEnter={(e) =>
            shouldShowNotePopup(note, "table") &&
            handleNoteTextMouseEnter(note, e)
          }
          onMouseLeave={() =>
            shouldShowNotePopup(note, "table") &&
            handleNoteTextMouseLeave()
          }
        >
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              display: "block",
              maxWidth: "100%",
            }}
            dangerouslySetInnerHTML={{
              __html:
                note.note && note.note.length > 69
                  ? highlightHtmlContent(
                      note.note.substring(0, 69) + "...",
                      searchTerm,
                    )
                  : highlightHtmlContent(note.note || "", searchTerm),
            }}
          />
        </div>
      </td>
      <td>
        <UserStatusIndicator
          userId={note.userId}
          userName={note.userName}
          userStatusMap={userStatusMap}
          loadingUsers={loadingUsers}
        />
      </td>
      <td
        className="file-cell"
        onClick={(e) => {
          e.stopPropagation();
          handleViewAttachments(note);
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <i
            className="fas fa-paperclip"
            style={{ opacity: note.documentCount > 0 ? 1 : 0.3 }}
          />
          <span>({note.documentCount || 0})</span>

          {/* Reply button */}
          <i
            className="fas fa-reply"
            style={{
              color: "#3498db",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Reply"
            onClick={(e) => {
              e.stopPropagation();
              handleReplyToNote(note);
            }}
          />

          {/* Link button - only for reply notes */}
          {shouldShowLink && ( 
            <button
              className="link-to-note-btn"
              onClick={(e) => handleLinkedNoteClick(note.id, e)}
              onMouseEnter={(e) => handleLinkedNoteMouseEnter(note.id, e)}
              onMouseLeave={handleLinkedNoteMouseLeave}
              style={{
                background: "none",
                border: "1px solid #3498db",
                color: "#3498db",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginLeft: "4px",
                height: "24px",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fas fa-link" style={{ fontSize: "10px" }} />
            </button>
          )}

          {renderTableImageIcon && renderTableImageIcon(note)}
        </span>
      </td>
      <td className="table-actions">
        <ActionButton
          icon="fas fa-plus"
          title="Add"
          onClick={(e) => {
            e.stopPropagation();
            handleAddFromRow(note);
          }}
        />
        <ActionButton
          icon="fas fa-edit"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(note);
          }}
        />
        <ActionButton
          icon="fas fa-trash"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(note);
          }}
        />
        <PriorityIndicator
          priorityValue={priorityValue}
          note={note}
          onClick={handlePriorityClick}
          onMouseEnter={handlePriorityMouseEnter}
          onMouseLeave={handlePriorityMouseLeave}
          size="small"
        />
      </td>
    </tr>
  );
});

const ActionButton = ({ icon, title, onClick }) => (
  <a onClick={onClick} title={title}>
    <i className={icon} />
  </a>
);

NoteRow.propTypes = {
  note: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isLast: PropTypes.bool,
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
  focusedRow: PropTypes.any,
};

NoteRow.defaultProps = {
  isLast: false,
  selectedRow: null,
  searchTerm: "",
  renderTableImageIcon: () => null,
  focusedRow: null,
  isOriginalNoteExists: () => false,
};

export default NoteRow;