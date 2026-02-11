import { useState, useCallback, useEffect } from "react";
import { API_BASE_URL } from "../utils/constants";

export const useNoteReplies = ({ userId, displayNotes = [] }) => {
  const [noteReplies, setNoteReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [existingOriginalNotes, setExistingOriginalNotes] = useState(new Set());

  // Update existing original notes when displayNotes changes
  useEffect(() => {
    if (displayNotes && Array.isArray(displayNotes) && displayNotes.length > 0) {
      const existingIds = new Set(displayNotes.map(note => String(note.id)));
      setExistingOriginalNotes(existingIds);
    }
  }, [displayNotes]);

  const fetchNoteReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/SiteNote/GetAllReplies?pageNumber=1&pageSize=1000&userId=${userId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setNoteReplies(data.siteNotes || []);
      }
    } catch (error) {
      console.error("Error fetching note replies:", error);
    } finally {
      setLoadingReplies(false);
    }
  }, [userId]);

  const isNoteReply = useCallback(
    (noteId) => {
      return noteReplies.some((reply) => String(reply.id) === String(noteId));
    },
    [noteReplies],
  );

  const getReplyNoteId = useCallback(
    (replyNoteId) => {
      const reply = noteReplies.find((reply) => String(reply.id) === String(replyNoteId));
      return reply ? reply.reply : null;
    },
    [noteReplies],
  );

  // Check if original note still exists in displayNotes
  const isOriginalNoteExists = useCallback(
    (originalNoteId) => {
      if (!originalNoteId) return false;
      return existingOriginalNotes.has(String(originalNoteId));
    },
    [existingOriginalNotes],
  );

  // Fetch replies on mount
  useEffect(() => {
    if (!loadingReplies && noteReplies.length === 0) {
      fetchNoteReplies();
    }
  }, [fetchNoteReplies, loadingReplies, noteReplies.length]);

  return {
    noteReplies,
    loadingReplies,
    fetchNoteReplies,
    isNoteReply,
    getReplyNoteId,
    isOriginalNoteExists,
  };
};