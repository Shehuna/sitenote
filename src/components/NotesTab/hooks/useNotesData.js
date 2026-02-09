import { useState, useEffect } from "react";
import { deduplicateNotes, sortNotesByDate } from "../utils/noteUtils";

export const useNotesData = ({
  searchTerm,
  hasActiveFilters,
  searchResults,
  filteredNotesFromApi,
  localNotes,
  finalDisplayNotes,
  manuallyUpdatedPriorities = {}, // Add default value
}) => {
  const [displayNotes, setDisplayNotes] = useState([]);

  useEffect(() => {
    let notes = [];

    if (searchTerm.trim() || hasActiveFilters) {
      const sourceNotes = searchTerm.trim()
        ? searchResults || []
        : filteredNotesFromApi || [];
      
      notes = deduplicateNotes(sourceNotes);
    } else if (finalDisplayNotes && finalDisplayNotes.length > 0) {
      if (localNotes.length === 0) {
        notes = [...finalDisplayNotes];
      } else {
        const allNotesMap = new Map();

        localNotes.forEach((note) => {
          allNotesMap.set(note.id, note);
        });

        finalDisplayNotes.forEach((note) => {
          allNotesMap.set(note.id, note);
        });

        notes = Array.from(allNotesMap.values());
      }
    } else {
      notes = localNotes || [];
    }

    // Apply manually updated priorities if they exist
    if (manuallyUpdatedPriorities) {
      notes = notes.map(note => ({
        ...note,
        priority: manuallyUpdatedPriorities[note.id] !== undefined
          ? manuallyUpdatedPriorities[note.id]
          : note.priority
      }));
    }

    // Sort by date (most recent first)
    setDisplayNotes(sortNotesByDate(notes));
  }, [
    searchTerm,
    hasActiveFilters,
    searchResults,
    filteredNotesFromApi,
    localNotes,
    finalDisplayNotes,
    manuallyUpdatedPriorities, // Include in dependency array
  ]);

  return { displayNotes };
};