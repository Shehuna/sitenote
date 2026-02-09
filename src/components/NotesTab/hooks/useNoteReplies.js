import { useState, useCallback, useEffect } from "react";
import { API_BASE_URL } from "../utils/constants";

export const useNoteReplies = ({ userId }) => {
  const [noteReplies, setNoteReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

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
      return noteReplies.some((reply) => reply.id === noteId);
    },
    [noteReplies],
  );

  const getReplyNoteId = useCallback(
    (replyNoteId) => {
      const reply = noteReplies.find((reply) => reply.id === replyNoteId);
      return reply ? reply.reply : null;
    },
    [noteReplies],
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
  };
};