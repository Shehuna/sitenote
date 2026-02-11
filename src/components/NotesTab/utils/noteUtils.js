import { shouldShowNotePopup, getPriorityValue } from "./noteHelpers";

export { shouldShowNotePopup, getPriorityValue };

export const formatNoteContent = (note, searchTerm, viewMode) => {
  if (!note || !note.note) return "";

  const shouldTruncate = shouldShowNotePopup(note, viewMode);
  const content = shouldTruncate
    ? note.note.substring(0, viewMode === "table" ? 69 : 120) + "..."
    : note.note;

  return content;
};

export const getNoteInitials = (userName) => {
  if (!userName) return null;

  const names = userName.trim().split(/\s+/);
  const firstInitial = names[0] ? names[0].charAt(0).toUpperCase() : "";
  const lastInitial =
    names.length > 1
      ? names[names.length - 1].charAt(0).toUpperCase()
      : "";

  return firstInitial + lastInitial;
};

export const sortNotesByDate = (notes, descending = true) => {
  return [...notes].sort((a, b) => {
    const timeA = new Date(a.timeStamp || a.date || 0).getTime();
    const timeB = new Date(b.timeStamp || b.date || 0).getTime();
    return descending ? timeB - timeA : timeA - timeB;
  });
};

export const checkNoteExistsInList = (noteId, notesList) => {
  if (!noteId || !notesList || !Array.isArray(notesList)) return false;
  return notesList.some(note => String(note.id) === String(noteId));
};

export const getOriginalNote = (noteId, notesList, noteReplies = []) => {
  if (!noteId || !notesList || !noteReplies) return null;
  
  const reply = noteReplies.find(reply => reply.id === noteId);
  if (!reply || !reply.reply) return null;
  
  return notesList.find(note => String(note.id) === String(reply.reply));
};

export const deduplicateNotes = (notes) => {
  const seen = new Map();
  const deduplicated = [];

  for (const note of notes) {
    if (note.id && !seen.has(note.id)) {
      seen.set(note.id, note);
      deduplicated.push(note);
    }
  }

  return deduplicated;
};