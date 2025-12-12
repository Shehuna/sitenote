import React from "react";
import PropTypes from "prop-types";
import "./NotesTab.css";

const NotesTab = ({
  viewMode,
  finalDisplayNotes,
  isDataLoaded,
  initialLoading,
  searchLoading,
  loadingFiltered,
  loadingUniques,
  searchTerm,
  getActiveFilterCount,
  handleRowClick,
  handleRowDoubleClick,
  priorities,
  handleAddFromRow,
  handleEdit,
  handleDelete,
  handleViewAttachments,
  selectedRow,
  focusedRow,
  inlineImagesMap,
  loadingImages,
  renderTableImageIcon,
  renderCardImageIcon,
  renderStackedImageIcon,
  handleImageThumbnailClick,
  handlePriorityChange,
  showPriorityDropdown,
  setShowPriorityDropdown,
  selectedNoteForPriority,
  priorityDropdownPosition,
  setSelectedNoteForPriority,
  setPriorityDropdownPosition,
  expandedStacks,
  toggleStackExpansion,
  expandedCardLimit,
  loadMoreCards,
  jobs,
  setViewNote,
  setShowViewModal,
}) => {
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };
  const notesByJob = {};
  finalDisplayNotes.forEach((note) => {
    const jobName = note.job || "Unassigned";
    if (!notesByJob[jobName]) {
      notesByJob[jobName] = [];
    }
    notesByJob[jobName].push(note);
  });
  Object.keys(notesByJob).forEach(jobName => {
    notesByJob[jobName].sort((a, b) => {
      const timeA = new Date(a.timeStamp || a.date || 0).getTime();
      const timeB = new Date(b.timeStamp || b.date || 0).getTime();
      return timeB - timeA;
    });
  });
  const isAnyStackExpanded = Object.values(expandedStacks).some((v) => v);
  const sortedJobs = Object.keys(notesByJob).sort(
    (a, b) => {
      const mostRecentA = notesByJob[a][0] ?
          new Date(notesByJob[a][0].timeStamp || notesByJob[a][0].date || 0).getTime() : 0;
      const mostRecentB = notesByJob[b][0] ?
          new Date(notesByJob[b][0].timeStamp || notesByJob[b][0].date || 0).getTime() : 0;
      return mostRecentB - mostRecentA;
    }
  );

  return (
    <div className="grid-scroll-container">
      {viewMode === "table" ? (
        <div className="responsive-table-container">
          <table>
            <thead>
              <tr>
                {[
                  "date",
                  "workspace",
                  "project",
                  "job",
                  "note",
                  "userName",
                  "Attached Files",
                ].map((c) => (
                  <th key={c} className="filterable-column">
                    {c === "date" && <i className="fas fa-calendar" />}
                    {c === "workspace" && <i className="fas fa-building" />}
                    {c === "project" && (
                      <i className="fas fa-project-diagram" />
                    )}
                    {c === "job" && <i className="fas fa-tasks" />}
                    {c === "note" && <i className="fas fa-sticky-note" />}
                    {c === "userName" && <i className="fas fa-user" />}
                    {c === "Attached Files" && (
                      <i className="fas fa-paperclip" />
                    )}{" "}
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!isDataLoaded ||
              initialLoading ||
              searchLoading ||
              loadingFiltered ||
              loadingUniques ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
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
                ))
              ) : finalDisplayNotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#999",
                    }}
                  >
                    {isDataLoaded && !initialLoading && !loadingUniques ? (
                      <>
                        <i
                          className="fas fa-search"
                          style={{
                            fontSize: 28,
                            marginBottom: 12,
                            display: "block",
                            opacity: 0.5,
                          }}
                        />{" "}
                        <div>
                          {searchTerm.trim()
                            ? "No notes match your search"
                            : getActiveFilterCount() > 0
                            ? "No notes match your filters"
                            : "No notes available"}
                        </div>
                      </>
                    ) : null}
                  </td>
                </tr>
              ) : (
                finalDisplayNotes.map((n) => {
                  const notePriority = priorities.find(
                    (p) => Number(p.noteID) === Number(n.id)
                  );
                  const inlineImages = inlineImagesMap[n.id] || [];
                  return (
                    <tr
                      key={n.id}
                      onClick={() => {
                        handleRowClick(n);
                      }}
                      onDoubleClick={() => {
                        handleRowDoubleClick(n);
                        const job = jobs.find(
                          (j) =>
                            String(j.id) === String(n.job) ||
                            j.name === n.job ||
                            j.title === n.job ||
                            j.jobName === n.job
                        );
                        setViewNote({
                          id: n.id,
                          jobId: job?.id ?? null,
                        });
                        setShowViewModal(true);
                      }}
                      className={`${
                        selectedRow === n.id ? "selected-row" : ""
                      } ${focusedRow === n.id ? "focused-row" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        title={new Date(n.date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      >
                        {formatRelativeTime(n.timeStamp)}
                      </td>
                      <td>{n.workspace}</td>
                      <td>{n.project}</td>
                      <td>{n.job}</td>
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
                          }}
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
                                n.note.length > 69
                                  ? n.note.substring(0, 69) + "..."
                                  : n.note,
                            }}
                          />
                          {n.note.length > 69 && (
                            <div
                              className="note-hover-popup"
                              dangerouslySetInnerHTML={{ __html: n.note }}
                            />
                          )}
                          {notePriority &&
                          notePriority.priorityValue > 1 ? (
                            <div
                              className={`priority-dot priority-dot-${notePriority.priorityValue}`}
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                cursor: "pointer",
                                zIndex: 10,
                              }}
                              title={
                                notePriority.priorityValue === 3
                                  ? "Medium Priority - Click to change"
                                  : notePriority.priorityValue === 4
                                  ? "High Priority - Click to change"
                                  : "Low Priority"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNoteForPriority(n);
                                setPriorityDropdownPosition({
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                                setShowPriorityDropdown(true);
                              }}
                            />
                          ) : (
                            <div
                              className="priority-dot priority-dot-placeholder"
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                cursor: "pointer",
                                zIndex: 10,
                                opacity: 0.2,
                                border: "1px dashed #bdc3c7",
                                backgroundColor: "transparent",
                                transition: "all 0.2s ease",
                              }}
                              title="Click to set priority"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNoteForPriority(n);
                                setPriorityDropdownPosition({
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                                setShowPriorityDropdown(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.5";
                                e.currentTarget.style.borderColor =
                                  "#3498db";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.2";
                                e.currentTarget.style.borderColor =
                                  "#bdc3c7";
                              }}
                            />
                          )}
                        </div>
                      </td>
                      <td>{n.userName}</td>
                      <td
                        className="file-cell"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAttachments(n);
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <i
                            className="fas fa-paperclip"
                            style={{
                              opacity: n.documentCount > 0 ? 1 : 0.3,
                            }}
                          />
                          <span>({n.documentCount || 0})</span>
                          {/* Inline Images Icon */}
                          {renderTableImageIcon(n)}
                        </span>
                      </td>
                      <td className="table-actions">
                        <a
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddFromRow(n);
                          }}
                          title="Add"
                        >
                          <i className="fas fa-plus" />
                        </a>
                        <a
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(n);
                          }}
                          title="Edit"
                        >
                          <i className="fas fa-edit" />
                        </a>
                        <a
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n);
                          }}
                          title="Delete"
                        >
                          <i className="fas fa-trash" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "stacked" ? (
        <div className="stacked-notes-horizontal">
          {!isDataLoaded ||
          initialLoading ||
          searchLoading ||
          loadingFiltered ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="note-card skeleton">
                <div className="skeleton-header">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-text short" />
                </div>
                <div className="skeleton-content">
                  <div className="skeleton-text long" />
                </div>
                <div className="skeleton-footer">
                  <div className="skeleton-actions" />
                </div>
              </div>
            ))
          ) : finalDisplayNotes.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-search" />
              <h3>
                {searchTerm.trim()
                  ? "No notes match your search"
                  : getActiveFilterCount() > 0
                  ? "No notes match your filters"
                  : "No notes available"}
              </h3>
              <p>
                {searchTerm.trim()
                  ? "Try adjusting your search terms"
                  : getActiveFilterCount() > 0
                  ? "Try clearing some filters"
                  : "Create your first note to get started"}
              </p>
            </div>
          ) : (
            <div className="stacked-container">
              {isAnyStackExpanded && (
                <div className="fixed-collapse-btn-wrapper">
                  <button
                    className="collapse-all-stacks-btn"
                    onClick={() => {
                      Object.keys(expandedStacks).forEach(jobName => {
                        if (expandedStacks[jobName]) {
                          toggleStackExpansion(jobName);
                        }
                      });
                    }}
                  >
                    <i className="fas fa-compress" />
                  </button>
                </div> 
              )}
              {sortedJobs.map((jobName) => {
                const jobNotes = notesByJob[jobName];
                const isExpanded = expandedStacks[jobName];
                const noteCount = jobNotes.length;
                const currentLimit = expandedCardLimit[jobName] ?? 50;
                console.log(`Job: ${jobName}, Limit Used: ${currentLimit}`);
                const displayNotes = isExpanded
                  ? jobNotes.slice(0, Math.min(currentLimit, noteCount))
                  : [];
                const remainingNotes = noteCount - currentLimit;
                if (!isExpanded && isAnyStackExpanded) {
                  return null;
                }
                return (
                  <div
                    key={`stack-${jobName}`}
                    className={`job-stack-container ${
                      isExpanded
                        ? "expanded-full-width"
                        : "collapsed-vertical-stack"
                    }`}
                  >
                    {isExpanded ? (
                      <div className="expanded-stack">
                        <button
                          className="collapse-stack-btn fixed-corner-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStackExpansion(jobName);
                          }}
                          title="Collapse stack"
                        >
                          <i className="fas fa-compress" />
                        </button>
                        <div className="expanded-stack-header">
                          <div className="expanded-stack-title">
                            <i className="fas fa-briefcase" />
                            {jobName}
                          </div>
                          <div className="expanded-stack-count">
                            <i className="fas fa-layer-group" />
                            {noteCount} notes
                          </div>
                        </div>
                        <div className="expanded-notes-grid">
                          {displayNotes.map((note) => {
                            const notePriority = priorities.find(
                              (p) => p.noteID === note.id
                            );
                            return (
                              <div
                                key={note.id}
                                className={`note-card ${
                                  selectedRow === note.id ? "selected" : ""
                                } stack-expanded-card`}
                                onClick={() => handleRowClick(note)}
                                onDoubleClick={() =>
                                  handleRowDoubleClick(note)
                                }
                              >
                                <div className="note-header">
                                  <div className="user-avatar-wrapper">
                                    <div className="user-avatar">
                                      {note.userName ? (
                                        (() => {
                                          const names = note.userName
                                            .trim()
                                            .split(/\s+/);
                                          const firstInitial = names[0]
                                            ? names[0]
                                                .charAt(0)
                                                .toUpperCase()
                                            : "";
                                          const lastInitial =
                                            names.length > 1
                                              ? names[names.length - 1]
                                                  .charAt(0)
                                                  .toUpperCase()
                                              : "";
                                          return firstInitial + lastInitial;
                                        })()
                                      ) : (
                                        <i className="fas fa-user" />
                                      )}
                                    </div>
                                    <div className="user-tooltip">
                                      {note.userName || "Unknown User"}
                                    </div>
                                  </div>
                                  <div className="note-meta">
                                    <div
                                      className="note-author"
                                      title={
                                        note.userName || "Unknown User"
                                      }
                                    >
                                      {note.userName}
                                    </div>
                                    <div
                                      className="note-date"
                                      title={new Date(
                                        note.date
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    >
                                      {formatRelativeTime(note.timeStamp)}
                                    </div>
                                  </div>
                                  <div className="note-context">
                                    <div
                                      className="context-item job"
                                      title={note.job}
                                    >
                                      {note.job}
                                    </div>
                                    <div className="context-item workspace-project">
                                      <span title={note.workspace}>
                                        {note.workspace}
                                      </span>
                                      /
                                      <span title={note.project}>
                                        {note.project}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="note-content">
                                  <div
                                    className="note-card-content-container"
                                    style={{ position: "relative" }}
                                  >
                                    <div
                                      className="note-text"
                                      dangerouslySetInnerHTML={{
                                        __html: note.note,
                                      }}
                                    />
                                    {note.note.length > 150 && (
                                      <div className="note-card-popup">
                                        {note.note}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="note-footer">
                                  <div
                                    className="note-attachments"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                    }}
                                  >
                                    {/* Inline Images Icon */}
                                    {renderStackedImageIcon(note)}
                                    {/* Attached Files */}
                                    <button
                                      className="attachment-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewAttachments(note);
                                      }}
                                    >
                                      <i
                                        className="fas fa-paperclip"
                                        style={{
                                          opacity:
                                            note.documentCount > 0
                                              ? 1
                                              : 0.3,
                                        }}
                                      />
                                      <span>
                                        ({note.documentCount || 0})
                                      </span>
                                    </button>
                                  </div>
                                  <div className="note-actions">
                                    {notePriority &&
                                    notePriority.priorityValue > 1 ? (
                                      <div
                                        className={`priority-indicator priority-${notePriority.priorityValue}`}
                                        style={{ cursor: "pointer" }}
                                        title={
                                          notePriority.priorityValue === 3
                                            ? "Medium Priority - Click to change"
                                            : notePriority.priorityValue ===
                                              4
                                            ? "High Priority - Click to change"
                                            : "No Priority"
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNoteForPriority(note);
                                          setPriorityDropdownPosition({
                                            x: e.clientX,
                                            y: e.clientY,
                                          });
                                          setShowPriorityDropdown(true);
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="priority-placeholder"
                                        style={{
                                          cursor: "pointer",
                                          opacity: 0.2,
                                          transition: "all 0.2s ease",
                                          width: "16px",
                                          height: "16px",
                                          borderRadius: "50%",
                                          border: "1px dashed #ddd",
                                          backgroundColor: "transparent",
                                        }}
                                        title="Click to set priority"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNoteForPriority(note);
                                          setPriorityDropdownPosition({
                                            x: e.clientX,
                                            y: e.clientY,
                                          });
                                          setShowPriorityDropdown(true);
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.opacity =
                                            "0.5";
                                          e.currentTarget.style.borderColor =
                                            "#3498db";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.opacity =
                                            "0.2";
                                          e.currentTarget.style.borderColor =
                                            "#ddd";
                                        }}
                                      />
                                    )}
                                    <button
                                      className="action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddFromRow(note);
                                      }}
                                      title="Add New Note"
                                    >
                                      <i className="fas fa-plus" />
                                    </button>
                                    <button
                                      className="action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(note);
                                      }}
                                      title="Edit Note"
                                    >
                                      <i className="fas fa-edit" />
                                    </button>
                                    <button
                                      className="action-btn delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(note);
                                      }}
                                      title="Delete Note"
                                    >
                                      <i className="fas fa-trash" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {remainingNotes > 0 && (
                          <div className="load-more-container">
                            <button
                              className="load-more-btn"
                              onClick={() => loadMoreCards(jobName)}
                            >
                              Load {Math.min(remainingNotes, 10)} more notes
                              <i
                                className="fas fa-caret-down"
                                style={{ marginLeft: "5px" }}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="collapsed-stack"
                        onClick={() => toggleStackExpansion(jobName)}
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          height: "280px",
                          width: "100%",
                        }}
                      >
                        {[...Array(Math.min(noteCount, 5))].map(
                          (_, index) => {
                            const note = jobNotes[index];
                            const isTopCard = index === 0;
                            return (
                              <div
                                key={`layer-${index}`}
                                className="stack-layer-card"
                                style={{
                                  position: "absolute",
                                  right: "0",
                                  left: `${index * 15}px`,
                                  transform: `rotate(${index * -2}deg)`,
                                  zIndex: 5 - index,
                                  width: "300px",
                                  height: "250px",
                                  opacity: 1 - index * 0.2,
                                  transition: "all 0.3s ease",
                                  overflow: "hidden",
                                }}
                              >
                                {isTopCard ? (
                                  <div
                                    style={{
                                      padding: "15px",
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "15px",
                                        paddingBottom: "10px",
                                        borderBottom: "1px solid #f0f0f0",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        }}
                                      >
                                        <i
                                          className="fas fa-briefcase"
                                          style={{ color: "#3498db" }}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: "#2c3e50",
                                            fontSize: "16px",
                                          }}
                                        >
                                          {jobName}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          background: "#3498db",
                                          color: "white",
                                          padding: "4px 10px",
                                          borderRadius: "20px",
                                          fontSize: "12px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        <i className="fas fa-layer-group" />
                                        <span>{noteCount} notes</span>
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            backgroundColor: "#3498db",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          {note.userName
                                            ? note.userName
                                                .charAt(0)
                                                .toUpperCase()
                                            : "U"}
                                        </div>
                                        <span
                                          style={{
                                            fontSize: "14px",
                                            color: "#555",
                                          }}
                                        >
                                          {note.userName || "Unknown User"}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          color: "#666",
                                          lineHeight: 1.4,
                                          flex: 1,
                                          overflow: "hidden",
                                          display: "-webkit-box",
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: "vertical",
                                        }}
                                        dangerouslySetInnerHTML={{
                                          __html: note.note,
                                        }}
                                      />
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#888",
                                          marginTop: "auto",
                                        }}
                                      >
                                        {formatRelativeTime(note.timeStamp)}
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        textAlign: "center",
                                        paddingTop: "10px",
                                        borderTop: "1px dashed #e9ecef",
                                        marginTop: "10px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          color: "#7f8c8d",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        Click to expand
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      height: "100%",
                                      background:
                                        "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#bdc3c7",
                                    }}
                                  >
                                    <i
                                      className="fas fa-sticky-note"
                                      style={{ fontSize: "24px" }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {!isDataLoaded ||
          initialLoading ||
          searchLoading ||
          loadingFiltered ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="note-card skeleton">
                <div className="skeleton-header">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-text short" />
                </div>
                <div className="skeleton-content">
                  <div className="skeleton-text long" />
                </div>
                <div className="skeleton-footer">
                  <div className="skeleton-actions" />
                </div>
              </div>
            ))
          ) : finalDisplayNotes.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-search" />
              <h3>
                {searchTerm.trim()
                  ? "No notes match your search"
                  : getActiveFilterCount() > 0
                  ? "No notes match your filters"
                  : "No notes available"}
              </h3>
              <p>
                {searchTerm.trim()
                  ? "Try adjusting your search terms"
                  : getActiveFilterCount() > 0
                  ? "Try clearing some filters"
                  : "Create your first note to get started"}
              </p>
            </div>
          ) : (
            finalDisplayNotes.map((note) => {
              const notePriority = priorities.find(
                (p) => p.noteID === note.id
              );
              const inlineImages = inlineImagesMap[note.id] || [];
              return (
                <div
                  key={note.id}
                  className={`note-card ${
                    selectedRow === note.id ? "selected" : ""
                  }`}
                  onClick={() => handleRowClick(note)}
                  onDoubleClick={() => handleRowDoubleClick(note)}
                >
                  <div className="note-header">
                    <div className="user-avatar-wrapper">
                      <div className="user-avatar">
                        {note.userName ? (
                          (() => {
                            const names = note.userName.trim().split(/\s+/);
                            const firstInitial = names[0]
                              ? names[0].charAt(0).toUpperCase()
                              : "";
                            const lastInitial =
                              names.length > 1
                                ? names[names.length - 1]
                                    .charAt(0)
                                    .toUpperCase()
                                : "";
                            return firstInitial + lastInitial;
                          })()
                        ) : (
                          <i className="fas fa-user" />
                        )}
                      </div>
                      <div className="user-tooltip">
                        {note.userName || "Unknown User"}
                      </div>
                    </div>
                    <div className="note-meta">
                      <div
                        className="note-author"
                        title={note.userName || "Unknown User"}
                      >
                        {note.userName}
                      </div>
                      <div
                        className="note-date"
                        title={new Date(note.date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      >
                        {formatRelativeTime(note.timeStamp)}
                      </div>
                    </div>
                    <div className="note-context">
                      <div className="context-item job" title={note.job}>
                        {note.job}
                      </div>
                      <div className="context-item workspace-project">
                        <span title={note.workspace}>{note.workspace}</span>
                        /<span title={note.project}>{note.project}</span>
                      </div>
                    </div>
                  </div>
                  <div className="note-content">
                    <div
                      className="note-card-content-container"
                      style={{ position: "relative" }}
                    >
                      <div
                        className="note-text"
                        dangerouslySetInnerHTML={{ __html: note.note }}
                      />
                      {/* Hover Popup for Card View - only show if note is long */}
                      {note.note.length > 150 && (
                        <div
                          className="note-card-popup"
                          dangerouslySetInnerHTML={{ __html: note.note }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="note-footer">
                    <div
                      className="note-attachments"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {/* Inline Images Icon */}
                      {renderCardImageIcon(note)}
                      {/* Attached Files */}
                      <button
                        className="attachment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAttachments(note);
                        }}
                      >
                        <i
                          className="fas fa-paperclip"
                          style={{
                            opacity: note.documentCount > 0 ? 1 : 0.3,
                          }}
                        />
                        <span>({note.documentCount || 0})</span>
                      </button>
                    </div>
                    <div className="note-actions">
                      {notePriority && notePriority.priorityValue > 1 ? (
                        <div
                          className={`priority-indicator priority-${notePriority.priorityValue}`}
                          style={{ cursor: "pointer" }}
                          title={
                            notePriority.priorityValue === 3
                              ? "Medium Priority - Click to change"
                              : notePriority.priorityValue === 4
                              ? "High Priority - Click to change"
                              : "No Priority"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNoteForPriority(note);
                            setPriorityDropdownPosition({
                              x: e.clientX,
                              y: e.clientY,
                            });
                            setShowPriorityDropdown(true);
                          }}
                        />
                      ) : (
                        <div
                          className="priority-placeholder"
                          style={{
                            cursor: "pointer",
                            opacity: 0.2,
                            transition: "all 0.2s ease",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: "1px dashed #ddd",
                            backgroundColor: "transparent",
                          }}
                          title="Click to set priority"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNoteForPriority(note);
                            setPriorityDropdownPosition({
                              x: e.clientX,
                              y: e.clientY,
                            });
                            setShowPriorityDropdown(true);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.5";
                            e.currentTarget.style.borderColor = "#3498db";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.2";
                            e.currentTarget.style.borderColor = "#ddd";
                          }}
                        />
                      )}
                      <button
                        className="action-btn add"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFromRow(note);
                        }}
                        title="Add New Note"
                      >
                        <i className="fas fa-plus" />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(note);
                        }}
                        title="Edit Note"
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note);
                        }}
                        title="Delete Note"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

NotesTab.propTypes = {
  viewMode: PropTypes.string.isRequired,
  finalDisplayNotes: PropTypes.array.isRequired,
  isDataLoaded: PropTypes.bool.isRequired,
  initialLoading: PropTypes.bool.isRequired,
  searchLoading: PropTypes.bool.isRequired,
  loadingFiltered: PropTypes.bool.isRequired,
  loadingUniques: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string.isRequired,
  getActiveFilterCount: PropTypes.func.isRequired,
  handleRowClick: PropTypes.func.isRequired,
  handleRowDoubleClick: PropTypes.func.isRequired,
  priorities: PropTypes.array.isRequired,
  handleAddFromRow: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleViewAttachments: PropTypes.func.isRequired,
  selectedRow: PropTypes.any,
  focusedRow: PropTypes.any,
  inlineImagesMap: PropTypes.object.isRequired,
  loadingImages: PropTypes.object.isRequired,
  renderTableImageIcon: PropTypes.func.isRequired,
  renderCardImageIcon: PropTypes.func.isRequired,
  renderStackedImageIcon: PropTypes.func.isRequired,
  handleImageThumbnailClick: PropTypes.func.isRequired,
  handlePriorityChange: PropTypes.func.isRequired,
  showPriorityDropdown: PropTypes.bool.isRequired,
  setShowPriorityDropdown: PropTypes.func.isRequired,
  selectedNoteForPriority: PropTypes.object,
  priorityDropdownPosition: PropTypes.object.isRequired,
  setSelectedNoteForPriority: PropTypes.func.isRequired,
  setPriorityDropdownPosition: PropTypes.func.isRequired,
  expandedStacks: PropTypes.object.isRequired,
  toggleStackExpansion: PropTypes.func.isRequired,
  expandedCardLimit: PropTypes.object.isRequired,
  loadMoreCards: PropTypes.func.isRequired,
  jobs: PropTypes.array.isRequired,
  setViewNote: PropTypes.func.isRequired,
  setShowViewModal: PropTypes.func.isRequired,
};

export default NotesTab;