export const shouldShowNotePopup = (note, viewMode) => {
  if (!note || !note.note) return false;

  if (viewMode === "table") {
    return note.note.length > 69;
  } else if (viewMode === "cards" || viewMode === "stacked") {
    return note.note.length > 150;
  }

  return false;
};

export const getPriorityValue = (note, manuallyUpdatedPriorities) => {
  return manuallyUpdatedPriorities[note.id] !== undefined
    ? manuallyUpdatedPriorities[note.id]
    : note.priority || 1;
};