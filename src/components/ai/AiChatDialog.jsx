import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { summarizeJob } from "./aiService";
import "./ai.css";

const AiChatDialog = ({ open, onClose, job, userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // initialize conversation with system prompt
    setMessages([
      {
        id: "system",
        role: "system",
        content: `Summarize notes for job: ${job?.jobName || "Unknown Job"}`,
      },
    ]);
    setInput("");
  }, [open, job]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const formatAiResponse = (text) => {
    if (!text) return "";

    const processInline = (s) => s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const lines = text.split(/\r?\n/);
    const parts = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length) {
        parts.push(`<ul>${currentList.join("")}</ul>`);
        currentList = [];
      }
    };

    for (let rawLine of lines) {
      const line = rawLine.replace(/\t/g, " ").trimEnd();
      if (line.trim().startsWith("- ")) {
        const item = line.trim().substring(2);
        currentList.push(`<li>${processInline(item)}</li>`);
        continue;
      }

      // non-list line
      flushList();

      if (line.trim() === "") {
        parts.push("<br/>");
        continue;
      }

      // If line contains raw HTML tags, keep it as-is (but still convert **bold** inside)
      const containsHtml = /<[^>]+>/.test(line);
      if (containsHtml) {
        parts.push(processInline(line));
      } else {
        parts.push(`<p>${processInline(line)}</p>`);
      }
    }

    flushList();

    return parts.join("\n");
  };

  const handleSend = async () => {
    if (!input.trim() || !job) return;
    const userMessage = { id: Date.now(), role: "user", content: input.trim() };
    setMessages((m) => [...m, userMessage]);
    setLoading(true);
    try {
      const res = await summarizeJob(userId, job.jobId, input.trim(), 10000);
      const assistantMsg = { id: `a-${Date.now()}`, role: "assistant", content: res };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      const assistantMsg = { id: `a-${Date.now()}`, role: "assistant", content: `Error: ${err.message}` };
      setMessages((m) => [...m, assistantMsg]);
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ai-modal-overlay" onMouseDown={onClose}>
      <div className="ai-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">Summarize: {job?.jobName || "Job"}</div>
          <div className="ai-header-actions">
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} aria-label="close">✕</button>
          </div>
        </div>

        <div className="ai-modal-body" ref={bodyRef}>
          <div className="ai-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`ai-msg ${m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "assistant"}`}
                dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? formatAiResponse(m.content) : (m.content) }}
              />
            ))}
            {loading && (
              <div className="ai-msg assistant">
                <span className="ai-spinner">⏳</span> Generating summary...
              </div>
            )}
          </div>
        </div>

        <div className="ai-modal-footer">
          <input
            className="ai-input"
            placeholder={`Ask to summarize notes for ${job?.jobName || 'this job'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="ai-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

AiChatDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  job: PropTypes.object,
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

AiChatDialog.defaultProps = {
  open: false,
  onClose: () => {},
  job: null,
  userId: null,
};

export default AiChatDialog;
