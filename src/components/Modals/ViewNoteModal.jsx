import React, { useState, useEffect, useRef } from "react";
import "./ViewNoteModal.css";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';

const ViewNoteModal = ({
  noteId,
  jobId,
  onClose,
  currentTheme,
  onViewAttachments,
  userid,
  scrollToNoteId,
}) => {
  const [currentNote, setCurrentNote] = useState(null);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [noteImages, setNoteImages] = useState({}); 
  const [loadingImages, setLoadingImages] = useState({}); 
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentLightboxImage, setCurrentLightboxImage] = useState(null);
  const [currentLightboxImages, setCurrentLightboxImages] = useState([]);
  const [noteReplies, setNoteReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});

  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState(null);
  const [showJobInfo, setShowJobInfo] = useState(false);
  const [managerInfo, setManagerInfo] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [maxNotes, setMaxNotes] = useState('All');

  const noteRefs = useRef({});
  const chatContainerRef = useRef(null);
  const lightboxRef = useRef(null);

  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Comprehensive emoji regex patterns
  const emojiPatterns = [
    /[\u{1F600}-\u{1F64F}]/gu, // Emoticons
    /[\u{1F300}-\u{1F5FF}]/gu, // Misc Symbols and Pictographs
    /[\u{1F680}-\u{1F6FF}]/gu, // Transport and Map Symbols
    /[\u{1F700}-\u{1F77F}]/gu, // Alchemical Symbols
    /[\u{1F780}-\u{1F7FF}]/gu, // Geometric Shapes Extended
    /[\u{1F800}-\u{1F8FF}]/gu, // Supplemental Arrows-C
    /[\u{1F900}-\u{1F9FF}]/gu, // Supplemental Symbols and Pictographs
    /[\u{1FA00}-\u{1FA6F}]/gu, // Chess Symbols
    /[\u{1FA70}-\u{1FAFF}]/gu, // Symbols and Pictographs Extended-A
    /[\u{2600}-\u{26FF}]/gu,   // Misc symbols
    /[\u{2700}-\u{27BF}]/gu,   // Dingbats
    /[\u{E000}-\u{F8FF}]/gu,   // Private Use Area
    /[\u{FE00}-\u{FE0F}]/gu,   // Variation Selectors
    /[\u{1F1E6}-\u{1F1FF}]/gu, // Regional indicator symbols
  ];

  // Check if character is an emoji
  const isEmoji = (character) => {
    // First check if it's a single character that might be garbled
    if (character.length > 1) {
      // Check each emoji pattern
      for (const pattern of emojiPatterns) {
        if (pattern.test(character)) {
          return true;
        }
      }
    }
    
    // Also check for common garbled sequences that might be emojis
    const garbledToEmojiMap = {
      "Ø>ÞàØ<ßI": "😀", // Example mapping, you might need to expand this
      // Add more mappings as you discover them
    };
    
    return garbledToEmojiMap[character] !== undefined;
  };

  // Get emoji character from garbled text
  const getEmojiFromGarbled = (garbledText) => {
    const garbledToEmojiMap = {
      "Ø>ÞàØ<ßI": "😀",
      "Ø>ÞàØ<ßJ": "😃",
      "Ø>ÞàØ<ßK": "😄",
      "Ø>ÞàØ<ßL": "😁",
      "Ø>ÞàØ<ßM": "😆",
      "Ø>ÞàØ<ßN": "😅",
      "Ø>ÞàØ<ßO": "😂",
      "Ø>ÞàØ<ßP": "🤣",
      "Ø>ÞàØ<ßQ": "😊",
      "Ø>ÞàØ<ßR": "😇",
      // Add more mappings as needed based on what you see
    };
    
    return garbledToEmojiMap[garbledText] || "❓"; // Default to question mark if unknown
  };

  // Detect if text contains any garbled emoji sequences
  const containsGarbledEmoji = (text) => {
    const garbledPatterns = [
      /Ø>ÞàØ<ß[I-Z]/g, // Pattern for garbled emojis
      /[^\x00-\x7F]{3,}/g, // Any non-ASCII sequence of 3+ characters
    ];
    
    for (const pattern of garbledPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  };

  // Replace garbled emoji sequences with actual emojis
  const fixGarbledEmojis = (text) => {
    if (!text) return text;
    
    let fixedText = text;
    
    // Replace known garbled patterns
    const garbledToEmojiMap = {
      "Ø>ÞàØ<ßI": "😀",
      "Ø>ÞàØ<ßJ": "😃",
      "Ø>ÞàØ<ßK": "😄",
      "Ø>ÞàØ<ßL": "😁",
      "Ø>ÞàØ<ßM": "😆",
      "Ø>ÞàØ<ßN": "😅",
      "Ø>ÞàØ<ßO": "😂",
      "Ø>ÞàØ<ßP": "🤣",
      "Ø>ÞàØ<ßQ": "😊",
      "Ø>ÞàØ<ßR": "😇",
      "Ø>ÞàØ<ßS": "🙂",
      "Ø>ÞàØ<ßT": "🙃",
      "Ø>ÞàØ<ßU": "😉",
      "Ø>ÞàØ<ßV": "😌",
      "Ø>ÞàØ<ßW": "😍",
      "Ø>ÞàØ<ßX": "😘",
      "Ø>ÞàØ<ßY": "😗",
      "Ø>ÞàØ<ßZ": "😙",
    };
    
    // Replace all known garbled patterns
    Object.keys(garbledToEmojiMap).forEach(garbled => {
      const regex = new RegExp(garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      fixedText = fixedText.replace(regex, garbledToEmojiMap[garbled]);
    });
    
    return fixedText;
  };

  // Create emoji as image on canvas
  const createEmojiImage = (emoji, fontSize = 12) => {
    try {
      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      const size = Math.max(fontSize * 1.2, 20);
      canvas.width = size;
      canvas.height = size;
      
      // Clear with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set font - use a system font that supports emojis
      ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Android Emoji", "EmojiOne Color", "Twemoji Mozilla", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      
      // Draw emoji
      ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
      
      // Convert to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error creating emoji image:', error);
      return null;
    }
  };

  // Alternative: Use Twemoji CDN for emoji images
  const getTwemojiUrl = (emoji, size = 72) => {
    try {
      // Convert emoji to code point
      const codePoint = emoji.codePointAt(0).toString(16);
      return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoint}.png`;
    } catch (error) {
      console.error('Error getting Twemoji URL:', error);
      return null;
    }
  };

  // Fetch emoji image from Twemoji
  const fetchEmojiImage = async (emoji) => {
    try {
      const url = getTwemojiUrl(emoji);
      if (!url) return null;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching emoji image:', error);
      return null;
    }
  };

  // Split text into segments (text and emojis)
  const splitTextIntoChunks = (text) => {
    if (!text) return [];
    
    // First fix any garbled emojis
    const fixedText = fixGarbledEmojis(text);
    
    const chunks = [];
    let currentChunk = '';
    let inEmojiChunk = false;
    
    for (let i = 0; i < fixedText.length; i++) {
      const char = fixedText[i];
      const nextChar = fixedText[i + 1];
      
      // Check if current character might be part of an emoji
      const charCode = char.charCodeAt(0);
      const isLikelyEmoji = charCode > 0x00FF || (charCode >= 0x1F600 && charCode <= 0x1F64F);
      
      if (isLikelyEmoji) {
        // End previous text chunk if exists
        if (currentChunk && !inEmojiChunk) {
          chunks.push({
            type: 'text',
            content: currentChunk
          });
          currentChunk = '';
        }
        
        inEmojiChunk = true;
        currentChunk += char;
        
        // Check if next character is also part of the same emoji (for multi-char emojis)
        if (nextChar && nextChar.charCodeAt(0) >= 0xFE00 && nextChar.charCodeAt(0) <= 0xFE0F) {
          // Variation selector, add to current emoji
          currentChunk += nextChar;
          i++; // Skip next character
        }
      } else {
        // End previous emoji chunk if exists
        if (currentChunk && inEmojiChunk) {
          chunks.push({
            type: 'emoji',
            content: currentChunk
          });
          currentChunk = '';
        }
        
        inEmojiChunk = false;
        currentChunk += char;
      }
    }
    
    // Add the last chunk
    if (currentChunk) {
      chunks.push({
        type: inEmojiChunk ? 'emoji' : 'text',
        content: currentChunk
      });
    }
    
    return chunks;
  };

  // Render text with emoji support for PDF
  const renderTextWithEmojis = (pdf, text, x, y, fontSize = 10, maxWidth = null) => {
    if (!text) return x;
    
    // Fix garbled emojis first
    const fixedText = fixGarbledEmojis(text);
    
    // Split into chunks
    const chunks = splitTextIntoChunks(fixedText);
    let currentX = x;
    
    for (const chunk of chunks) {
      if (chunk.type === 'text') {
        // Render regular text with Ethiopic support
        let run = '';
        let currentFont = 'helvetica';
        
        for (let char of chunk.content) {
          const isEth = isEthiopic(char);
          const newFont = isEth ? 'NotoEthiopic' : 'helvetica';
          
          if (newFont !== currentFont) {
            if (run) {
              pdf.setFont(currentFont, 'normal');
              pdf.text(run, currentX, y);
              currentX += pdf.getTextWidth(run);
            }
            currentFont = newFont;
            run = char;
          } else {
            run += char;
          }
        }
        
        if (run) {
          pdf.setFont(currentFont, 'normal');
          pdf.text(run, currentX, y);
          currentX += pdf.getTextWidth(run);
        }
      } else if (chunk.type === 'emoji') {
        // Render emoji as image
        try {
          // Create emoji image
          const emojiImage = createEmojiImage(chunk.content, fontSize);
          if (emojiImage) {
            const emojiSize = fontSize * 0.8;
            pdf.addImage(emojiImage, 'PNG', currentX, y - fontSize * 0.6, emojiSize, emojiSize);
            currentX += emojiSize * 0.9;
          } else {
            // Fallback: render as text
            pdf.setFont('helvetica', 'normal');
            pdf.text(chunk.content, currentX, y);
            currentX += pdf.getTextWidth(chunk.content);
          }
        } catch (error) {
          // Fallback to text
          pdf.setFont('helvetica', 'normal');
          pdf.text(chunk.content, currentX, y);
          currentX += pdf.getTextWidth(chunk.content);
        }
      }
    }
    
    return currentX;
  };

  // Fetch replies for a specific note
  const fetchNoteReplies = async (siteNoteId) => {
    if (!siteNoteId) return [];
    
    setLoadingReplies(prev => ({ ...prev, [siteNoteId]: true }));
    
    try {
      const response = await fetch(
        `${apiUrl}/SiteNote/GetRepliesBySiteNoteId?pageNumber=1&pageSize=10&siteNoteId=${siteNoteId}&userId=${userid}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch replies for note ${siteNoteId}`);
      }
      
      const data = await response.json();
      
      const replies = (data.siteNotes || []).map(reply => ({
        ...reply,
        userName: reply.UserName || reply.userName,
        documentCount: reply.DocumentCount || reply.documentCount || 0,
        date: reply.date || "",
        timeStamp: reply.timeStamp || reply.noteDate || "",
        isReply: true
      }));
      
      // Sort replies by timestamp ascending (oldest first)
      const sortedReplies = replies.sort((a, b) => {
        const timeA = new Date(a.timeStamp || a.date).getTime();
        const timeB = new Date(b.timeStamp || b.date).getTime();
        return timeA - timeB; // Ascending order
      });
      
      return sortedReplies;
    } catch (error) {
      console.error(`Error fetching replies for note ${siteNoteId}:`, error);
      return [];
    } finally {
      setLoadingReplies(prev => ({ ...prev, [siteNoteId]: false }));
    }
  };

  // Fetch inline images for a specific note
  const fetchInlineImages = async (siteNoteId) => {
    if (!siteNoteId) return [];
    
    setLoadingImages(prev => ({ ...prev, [siteNoteId]: true }));
    
    try {
      const response = await fetch(
        `${apiUrl}/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${siteNoteId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images for note ${siteNoteId}`);
      }
      
      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error(`Error fetching images for note ${siteNoteId}:`, error);
      return [];
    } finally {
      setLoadingImages(prev => ({ ...prev, [siteNoteId]: false }));
    }
  };

  // Fetch images for all related notes
  const fetchImagesForAllNotes = async (notes) => {
    const imagesMap = {};
    
    const promises = notes.map(async (note) => {
      if (note.id) {
        const images = await fetchInlineImages(note.id);
        imagesMap[note.id] = images;
      }
    });
    
    await Promise.all(promises);
    setNoteImages(imagesMap);
  };

  const fetchNoteAndRelated = async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const noteRes = await fetch(
        `${apiUrl}/SiteNote/GetSiteNoteById/${noteId}`
      );
      if (!noteRes.ok) throw new Error("Failed to fetch note");
      const noteData = await noteRes.json();

      const note = {
        ...noteData,
        userName: noteData.UserName || noteData.userName,
        documentCount: noteData.DocumentCount || noteData.documentCount || 0,
        date: noteData.date || "",
        timeStamp: noteData.timeStamp || "",
        isReply: false
      };
      setCurrentNote(note);

      if (jobId) {
        const jobRes = await fetch(`${apiUrl}/Job/GetJobById/${jobId}`);
        if (!jobRes.ok) throw new Error("Failed to fetch job details");
        const jobData = await jobRes.json();
        setJobDetails(jobData.job || jobData);
      }

      if (!jobId) {
        const notes = [note];
        setRelatedNotes(notes);
        // Fetch replies for the single note
        const replies = await fetchNoteReplies(noteId);
        if (replies.length > 0) {
          setNoteReplies({ [noteId]: replies });
        }
        await fetchImagesForAllNotes(notes);
        setLoading(false);
        return;
      }

      const url = `${apiUrl}/SiteNote/GetSiteNotesByJobId?pageNumber=1&pageSize=25&jobId=${jobId}&userId=${userid}`;
      const relRes = await fetch(url);
      if (!relRes.ok) throw new Error("Failed to fetch related notes");
      const relData = await relRes.json();

      const related = (relData.siteNotes || [])
        .map((n) => ({
          ...n,
          userName: n.UserName || n.userName,
          documentCount: n.DocumentCount || n.documentCount || 0,
          date: n.date || "",
          timeStamp: n.timeStamp || "",
          isReply: false
        }))
        .sort((a, b) => {
          const now = new Date();
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const da = new Date(a.date);
          const db = new Date(b.date);
          const aF = da > today;
          const bF = db > today;
          if (aF && !bF) return 1;
          if (!aF && bF) return -1;
          if (da.getTime() !== db.getTime()) return da - db;
          return a.id - b.id;
        });

      setRelatedNotes(related);
      
      // Fetch replies for ALL notes
      const fetchAllReplies = async () => {
        const repliesMap = {};
        
        for (const noteItem of related) {
          if (noteItem.id) {
            const replies = await fetchNoteReplies(noteItem.id);
            if (replies.length > 0) {
              // Replies are already sorted in fetchNoteReplies function
              repliesMap[noteItem.id] = replies;
            }
          }
        }
        
        setNoteReplies(repliesMap);
      };
      
      // Fetch images and replies in parallel
      await Promise.all([
        fetchImagesForAllNotes(related),
        fetchAllReplies()
      ]);
      
    } catch (err) {
      console.error("ViewNoteModal error:", err);
      toast.error("Failed to load note");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const scrollToCurrentNote = () => {
    const target = scrollToNoteId || noteId;
    const el = noteRefs.current[target];
    if (el && chatContainerRef.current) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "background .4s ease";
        el.style.background = "#e3f2fd";
        setTimeout(() => {
          el.style.background = "";
          el.style.borderLeft = "";
        }, 2000);
      });
    }
  };

  const openLightbox = (image, noteId) => {
    const images = noteImages[noteId] || [];
    const imageIndex = images.findIndex(img => img.id === image.id);
    
    setCurrentLightboxImage({
      ...image,
      noteId,
      index: imageIndex,
      total: images.length
    });
    setCurrentLightboxImages(images);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setCurrentLightboxImage(null);
    setCurrentLightboxImages([]);
    document.body.style.overflow = 'auto';
  };

  const navigateLightbox = (direction) => {
    if (!currentLightboxImage || currentLightboxImages.length === 0) return;
    
    const currentIndex = currentLightboxImage.index;
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % currentLightboxImages.length;
    } else {
      newIndex = (currentIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    }
    
    const newImage = currentLightboxImages[newIndex];
    setCurrentLightboxImage({
      ...newImage,
      noteId: currentLightboxImage.noteId,
      index: newIndex,
      total: currentLightboxImages.length
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          navigateLightbox('next');
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentLightboxImage]);

  useEffect(() => {
    fetchNoteAndRelated();
  }, [noteId, jobId, userid]);

  useEffect(() => {
    const fetchManager = async (id) => {
      if (!id) {
        setManagerInfo(null);
        return;
      }
      try {
        const res = await fetch(`${apiUrl}/UserManagement/GetUserById/${id}`);
        if (!res.ok) throw new Error('Failed to fetch manager');
        const data = await res.json();
        setManagerInfo(data.user || data);
      } catch (err) {
        console.error('Failed to fetch manager info', err);
        setManagerInfo(null);
      }
    };

    if (jobDetails?.managerId) fetchManager(jobDetails.managerId);
  }, [jobDetails]);

  useEffect(() => {
    if (!loading && relatedNotes.length) scrollToCurrentNote();
  }, [loading, relatedNotes, scrollToNoteId, noteId]);

  const formatDate = (iso) => {
    if (!iso) return "Invalid Date";
    const d = new Date(iso);
    return isNaN(d)
      ? "Invalid Date"
      : d.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
    }

    return messageTime.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const fetchFontBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
    });
  };

  const isEthiopic = (char) => {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x1200 && code <= 0x139F) ||
      (code >= 0x2D80 && code <= 0x2DDF) ||
      (code >= 0xAB00 && code <= 0xAB2F)
    );
  };

  // Render text with emoji and Ethiopic support
  const renderMixedText = (pdf, text, startX, startY, style = 'normal', fontSize = 10) => {
    return renderTextWithEmojis(pdf, text, startX, startY, fontSize);
  };

  const renderFormattedText = (pdf, html, startX, startY) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const body = doc.body;

    return renderElement(pdf, body, startX, startY, {
      bold: false,
      italic: false,
      underline: false,
      fontSize: 10,
      lineHeight: 5,
      indent: 0
    });
  };

  const renderElement = (pdf, element, x, y, styles) => {
    let currentY = y;
    const pageHeight = 270;
    const children = Array.from(element.childNodes);

    for (let child of children) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (!text) continue;

        pdf.setFontSize(styles.fontSize);

        const maxWidth = 180;
        const lines = pdf.splitTextToSize(text, maxWidth);

        for (let line of lines) {
          if (currentY + styles.lineHeight > pageHeight) {
            pdf.addPage();
            currentY = 10;
          }

          const style = styles.bold ? 'bold' : 'normal';
          renderTextWithEmojis(pdf, line, x + styles.indent, currentY, styles.fontSize);

          if (styles.underline) {
            const textWidth = pdf.getTextWidth(line);
            pdf.line(x + styles.indent, currentY + 1, x + styles.indent + textWidth, currentY + 1);
          }

          currentY += styles.lineHeight;
        }
      } else if (child.nodeType === 1) {
        let newStyles = { ...styles };
        const tag = child.tagName.toUpperCase();

        if (tag === 'B' || tag === 'STRONG') newStyles.bold = true;
        if (tag === 'I' || tag === 'EM') newStyles.italic = true;
        if (tag === 'U') newStyles.underline = true;
        if (tag === 'H1') newStyles.fontSize = 16;
        if (tag === 'H2') newStyles.fontSize = 14;
        if (tag === 'H3') newStyles.fontSize = 12;

        if (tag === 'BR') {
          currentY += styles.lineHeight;
        } else if (tag === 'P') {
          currentY += styles.lineHeight / 2;
          currentY = renderElement(pdf, child, x, currentY, newStyles);
          currentY += styles.lineHeight / 2;
        } else if (tag === 'UL' || tag === 'OL') {
          newStyles.indent += 10;
          currentY = renderElement(pdf, child, x, currentY, newStyles);
          newStyles.indent -= 10;
        } else if (tag === 'LI') {
          pdf.setFontSize(styles.fontSize);
          renderTextWithEmojis(pdf, '• ', x + styles.indent - 5, currentY, styles.fontSize);
          currentY = renderElement(pdf, child, x, currentY, newStyles);
          currentY += styles.lineHeight / 2;
        } else {
          currentY = renderElement(pdf, child, x, currentY, newStyles);
        }
      }
    }

    return currentY;
  };

const generatePDF = async () => {
  let max = maxNotes;
  if (typeof max === 'string') {
    const t = max.trim().toLowerCase();
    if (t === '' || t === 'all') max = '10000';
  }

  if (isNaN(parseInt(max)) || parseInt(max) <= 0) {
    toast.error("Invalid number of notes.");
    return;
  }

  setPdfGenerating(true);

  try {
    const notesToPrint = relatedNotes.slice(-parseInt(max));
    
    // We'll generate each page separately to prevent cutting notes
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    let currentPage = 1;
    let yPosition = 20; // Start position on page (mm)
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 20; // Margin on all sides
    const lineHeight = 5; // Line height in mm
    const noteSpacing = 2; // Space between notes in mm
    const maxContentWidth = pageWidth - (2 * margin); // Max width for content
    const footerHeight = 5; // Space for footer with page number

    // Store all page data for adding page numbers later
    const pageData = [];

    // Function to check if we need a new page
    const checkNewPage = (neededHeight) => {
      if (yPosition + neededHeight > pageHeight - margin - footerHeight) {
        // Store current page state before adding new page
        pageData.push({
          pageNum: currentPage,
          yPosition: yPosition
        });
        
        pdf.addPage();
        currentPage++;
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Add header only on first page
    if (currentPage === 1) {
      // Job Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      const jobTitle = `Job Notes - ${currentNote?.siteNote?.job || jobDetails?.name || `Job_${jobId || noteId}`}`;
      const titleWidth = pdf.getTextWidth(jobTitle);
      const titleX = (pageWidth - titleWidth) / 2;
      pdf.text(jobTitle, titleX, yPosition);
      yPosition += 12;

      // Divider line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Job details
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      
      if (currentNote?.siteNote?.workspace) {
        pdf.text(`Workspace: ${currentNote.siteNote.workspace}`, margin, yPosition);
        yPosition += lineHeight;
      }
      
      if (currentNote?.siteNote?.project) {
        pdf.text(`Project: ${currentNote.siteNote.project}`, margin, yPosition);
        yPosition += lineHeight;
      }
      
      if (jobDetails?.createdDate) {
        pdf.text(`Created: ${formatDate(jobDetails.createdDate)}`, margin, yPosition);
        yPosition += lineHeight;
      }
      
      yPosition += 5; // Extra space after header
    }

    // Process each note
    for (const note of notesToPrint) {
      // Calculate approximate height needed for this note
      let noteHeight = 0;
      
      // Note text height (truncated version)
      if (note.note) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.note;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const truncatedText = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
        
        // Split text into lines based on max width
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        const lines = pdf.splitTextToSize(truncatedText, maxContentWidth);
        noteHeight += lines.length * lineHeight;
      } else {
        noteHeight += lineHeight; // For "[No text]"
      }
      
      // User/date line
      noteHeight += lineHeight;
      
      // Images height
      const images = noteImages[note.id] || [];
      if (images.length > 0) {
        noteHeight += 30; // Approximate height for images
      }
      
      // Document count
      if (note.documentCount > 0) {
        noteHeight += lineHeight;
      }
      
      // Replies height
      if (noteReplies[note.id]) {
        noteHeight += 5; // Space for replies header
        noteReplies[note.id].forEach(() => {
          noteHeight += lineHeight * 2; // Approximate height per reply
        });
      }
      
      // Add spacing between notes
      noteHeight += noteSpacing;
      
      // Check if we need a new page before adding this note
      if (checkNewPage(noteHeight)) {
        // If it's a new page and not the first page, add some top margin
        if (currentPage > 1) {
          yPosition += 2; // Space at top of new pages
        }
      }
      
      // Create a container for this note
      const noteContainer = document.createElement('div');
      noteContainer.style.cssText = `
        width: ${maxContentWidth}mm;
        margin: 0 auto;
        padding: 8px;
        background: #f9f9f9;
        border-radius: 4px;
        margin-bottom: ${noteSpacing}mm;
        box-sizing: border-box;
      `;

      // Note header with text left, user/time right
      const noteHeader = document.createElement('div');
      noteHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
      `;

      // Note text
      const noteTextContainer = document.createElement('div');
      noteTextContainer.style.cssText = `
        flex: 1;
        min-width: 200px;
        font-weight: bold;
        color: #000;
        font-size: 13px;
        padding-right: 8px;
        line-height: 1.2;
      `;

      if (note.note) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.note;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        noteTextContainer.textContent = plainText.length > 200 
          ? plainText.substring(0, 200) + '...' 
          : plainText;
      } else {
        noteTextContainer.textContent = '[No text]';
      }

      noteHeader.appendChild(noteTextContainer);

      // User and date
      const userDateDiv = document.createElement('div');
      userDateDiv.style.cssText = `
        text-align: right;
        color: #666;
        font-size: 11px;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1.2;
      `;

      const noteDate = new Date(note.timeStamp || note.date);
      const formattedDate = !isNaN(noteDate.getTime()) 
        ? noteDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Invalid Date';

      userDateDiv.textContent = `${note.userName} - ${formattedDate}`;
      noteHeader.appendChild(userDateDiv);

      noteContainer.appendChild(noteHeader);

      // Full note text if truncated
      if (note.note) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.note;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        if (plainText.length > 200) {
          const fullNoteDiv = document.createElement('div');
          fullNoteDiv.style.cssText = `
            margin-top: 6px;
            color: #333;
            font-size: 12px;
            line-height: 1.3;
          `;
          fullNoteDiv.innerHTML = note.note;
          noteContainer.appendChild(fullNoteDiv);
        }
      }

      // Images
      if (images.length > 0) {
        const imagesContainer = document.createElement('div');
        imagesContainer.style.cssText = `
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        `;

        images.forEach(img => {
          const imgContainer = document.createElement('div');
          imgContainer.style.cssText = `
            width: 200px;
            height: 120px;
            overflow: hidden;
            position: relative;
          `;

          const imgElement = document.createElement('img');
          imgElement.src = `${apiUrl}/InlineImages/GetInlineImage/${img.id}`;
          imgElement.alt = img.fileName;
          imgElement.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
          `;
          
          imgContainer.appendChild(imgElement);
          imagesContainer.appendChild(imgContainer);
        });

        noteContainer.appendChild(imagesContainer);
      }

      // Document count
      if (note.documentCount > 0) {
        const docCountDiv = document.createElement('div');
        docCountDiv.style.cssText = `
          margin-top: 6px;
          color: #666;
          font-size: 10px;
          line-height: 1.2;
        `;
        docCountDiv.textContent = `📎 Attachments: ${note.documentCount}`;
        noteContainer.appendChild(docCountDiv);
      }

      // Replies
      if (noteReplies[note.id]) {
        const repliesContainer = document.createElement('div');
        repliesContainer.style.cssText = `
          margin-top: 10px;
          margin-left: 15px;
          border-left: 1px solid #ddd;
          padding-left: 8px;
        `;

        noteReplies[note.id].forEach(reply => {
          const replyRow = document.createElement('div');
          replyRow.style.cssText = `
            margin-bottom: 4px;
            padding: 6px;
            background: #fff;
            border-radius: 2px;
            border: 1px solid #eee;
          `;

          const replyHeader = document.createElement('div');
          replyHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          `;

          const replyIconText = document.createElement('div');
          replyIconText.style.cssText = `
            font-weight: 600;
            color: #000;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 3px;
            flex: 1;
            padding-right: 8px;
            line-height: 1.2;
          `;
          
          if (reply.note) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reply.note || '';
            const replyPlainText = tempDiv.textContent || tempDiv.innerText || '';
            const displayText = replyPlainText.length > 150 
              ? replyPlainText.substring(0, 150) + '...' 
              : replyPlainText;
            replyIconText.innerHTML = '↩️ ' + displayText;
          } else {
            replyIconText.innerHTML = '↩️ [No text]';
          }

          replyHeader.appendChild(replyIconText);

          const replyUserDate = document.createElement('div');
          replyUserDate.style.cssText = `
            text-align: right;
            color: #666;
            font-size: 10px;
            white-space: nowrap;
            flex-shrink: 0;
            line-height: 1.2;
          `;

          const replyDate = new Date(reply.timeStamp || reply.date);
          const replyFormattedDate = !isNaN(replyDate.getTime())
            ? replyDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Invalid Date';

          replyUserDate.textContent = `${reply.userName} - ${replyFormattedDate}`;
          replyHeader.appendChild(replyUserDate);

          replyRow.appendChild(replyHeader);
          repliesContainer.appendChild(replyRow);
        });

        noteContainer.appendChild(repliesContainer);
      }

      // Create a temporary container for this note
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: ${maxContentWidth}mm;
        background: white;
      `;
      tempContainer.appendChild(noteContainer);
      document.body.appendChild(tempContainer);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture this note as an image
      const canvas = await html2canvas(noteContainer, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const images = clonedDoc.querySelectorAll('img');
          const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          });
          return Promise.all(imagePromises);
        }
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Convert canvas to JPEG
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      // Calculate image dimensions
      const imgWidth = maxContentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if this note will fit on current page
      if (yPosition + imgHeight > pageHeight - margin - footerHeight) {
        // Store current page state before adding new page
        pageData.push({
          pageNum: currentPage,
          yPosition: yPosition
        });
        
        pdf.addPage();
        currentPage++;
        yPosition = margin;
        
        // Add space at top of new pages
        if (currentPage > 1) {
          yPosition += 1;
        }
      }
      
      // Add the note image to PDF
      pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      
      // Update yPosition for next note
      yPosition += imgHeight + noteSpacing;
    }

    // Store final page state
    pageData.push({
      pageNum: currentPage,
      yPosition: yPosition
    });

    // Add footer with page number to all pages
    const totalPages = currentPage;
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      pdf.setPage(pageNum);
      
      // Set page number style
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100); // Gray color
      
      // Page number text
      const pageNumberText = `Page ${pageNum} of ${totalPages}`;
      const textWidth = pdf.getTextWidth(pageNumberText);
      
      // Center the page number at the bottom
      const xPosition = (pageWidth - textWidth) / 2;
      const yPosition = pageHeight - 10; // 10mm from bottom
      
      pdf.text(pageNumberText, xPosition, yPosition);
    }

    // Save PDF
    const jobName = currentNote?.siteNote?.job || jobDetails?.name || `Job_${jobId || noteId}`;
    const pdfFileName = jobName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'notes';
    pdf.save(`${pdfFileName}_notes.pdf`);

    toast.success('PDF generated successfully!');

  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Failed to generate PDF');
  } finally {
    setPdfGenerating(false);
    setShowPrintDialog(false);
  }
};
  const renderNoteImages = (noteId) => {
    const images = noteImages[noteId] || [];
    
    if (loadingImages[noteId]) {
      return (
        <div className="images-loading">
          <i className="fas fa-spinner fa-spin" /> Loading images...
        </div>
      );
    }

    if (images.length === 0) {
      return null;
    }

    return (
      <div className="note-images-container">
        <div className="images-grid">
          {images.map((image) => (
            <div key={image.id} className="image-item">
              <img
                src={`${apiUrl}/InlineImages/GetInlineImage/${image.id}`}
                alt={image.fileName}
                className="inline-image"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                onClick={() => openLightbox(image, noteId)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/150x100?text=Image+Not+Found";
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNoteReplies = (noteId) => {
    const replies = noteReplies[noteId] || [];
    
    // Sort replies by timestamp ascending (oldest first) to ensure correct order
    const sortedReplies = [...replies].sort((a, b) => {
      const timeA = new Date(a.timeStamp || a.date).getTime();
      const timeB = new Date(b.timeStamp || b.date).getTime();
      return timeA - timeB; // Ascending order (oldest first)
    });
    
    if (loadingReplies[noteId]) {
      return (
        <div className="replies-loading">
          <i className="fas fa-spinner fa-spin" /> Loading replies...
        </div>
      );
    }

    if (sortedReplies.length === 0) {
      return null;
    }

    return (
      <div className="note-replies-container">
        <div className="replies-header">
          <i className="fas fa-reply" /> {sortedReplies.length} {sortedReplies.length === 1 ? 'Reply' : 'Replies'}
        </div>
        <div className="replies-list">
          {sortedReplies.map((reply) => (
            <div key={reply.id} className="reply-message">
              <div className="reply-content">
                <div className="reply-header">
                  <span className="reply-sender-name">
                    <i className="fas fa-reply fa-flip-horizontal" style={{ fontSize: '0.8em', marginRight: '5px', opacity: 0.7 }} />
                    {reply.userName}
                  </span>
                  <span
                    className="reply-time"
                    title={new Date(reply.timeStamp).toLocaleString()}
                  >
                    {formatRelativeTime(reply.timeStamp)}
                  </span>
                </div>
                <div 
                  className="reply-text" 
                  dangerouslySetInnerHTML={{ __html: reply.note }} 
                />
                
                {renderNoteImages(reply.id)}
                
                {reply.documentCount > 0 && (
                  <div className="reply-attachments">
                    <button
                      className="reply-attachment-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewAttachments(reply);
                      }}
                      title={`View ${reply.documentCount} attached file(s)`}
                    >
                      <span className="document-count-badge">
                        ({reply.documentCount}){" "}
                      </span>
                      <i className="fas fa-paperclip" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`view-note-modal-overlay theme-${currentTheme}`}>
        <div className="view-note-modal loading">
          <div className="loading-spinner">
          </div>
            <p>Loading note...</p>
        </div>
      </div>
    );
  }

  if (!currentNote) return null;

  return (
    <>
      <div
        className={`view-note-modal-overlay theme-${currentTheme}`}
        onClick={onClose}
      >
        <div className="view-note-modal" onClick={(e) => e.stopPropagation()}>
          <div className="whatsapp-header">
            <div className="header-left">
              <button className="back-button" onClick={onClose}>
                <i className="fas fa-arrow-left" />
              </button>
              <div className="contact-info">
                <div className="contact-name">
                  Workspace: {currentNote.siteNote.workspace}
                </div>
                <div className="contact-project">
                  Project: {currentNote.siteNote.project}
                </div>
                <div className="contact-status">
                  Job: {currentNote.siteNote.job}
                </div>
              </div>
            </div>
            <div className="header-right">
              <button
                className="more-info-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowJobInfo((s) => !s);
                }}
                title="More job info"
              >
                <i className="fas fa-info-circle" />
              </button>

              {showJobInfo && (
                <div className="job-attributes">
                  {jobDetails?.type && (
                    <div className="attr">
                      <span className="attr-key">Type:</span>
                      <span className="attr-value">{jobDetails.type}</span>
                    </div>
                  )}

                  {jobDetails?.priorityName && jobDetails.priorityName !== "Unknown" && (
                    <div className="attr">
                      <span className="attr-key">Priority:</span>
                      <span className="attr-value">{jobDetails.priorityName}</span>
                    </div>
                  )}

                  {jobDetails?.startDate && (
                    <div className="attr">
                      <span className="attr-key">Start:</span>
                      <span className="attr-value">{formatDate(jobDetails.startDate)}</span>
                    </div>
                  )}

                  {jobDetails?.endDate && (
                    <div className="attr">
                      <span className="attr-key">End:</span>
                      <span className="attr-value">{formatDate(jobDetails.endDate)}</span>
                    </div>
                  )}

                  {jobDetails?.actualEndDate && (
                    <div className="attr">
                      <span className="attr-key">Actual End:</span>
                      <span className="attr-value">{formatDate(jobDetails.actualEndDate)}</span>
                    </div>
                  )}

                  {jobDetails?.managerId != null && (
                    <div className="attr manager-info">
                      <span className="attr-key">Manager:</span>
                      <div className="attr-value">
                        <div className="manager-name">
                          {managerInfo
                            ? `${managerInfo.fname || managerInfo.firstName || ''} ${managerInfo.lname || managerInfo.lastName || ''}`.trim()
                            : `ID: ${jobDetails.managerId}`}
                        </div>
                        {managerInfo?.email && (
                          <div className="manager-email">{managerInfo.email}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {jobDetails?.createdDate && (
                    <div className="attr">
                      <span className="attr-key">Created:</span>
                      <span className="attr-value">{formatDate(jobDetails.createdDate)}</span>
                    </div>
                  )}
                </div>
              )}

              <button className="header-button" onClick={() => setShowPrintDialog(true)}>
                <i className="fas fa-print" />
              </button>
            </div>
          </div>

          <div className="whatsapp-chat" ref={chatContainerRef}>
            {relatedNotes.map((doc) => (
              <div
                key={doc.id}
                ref={(el) => (noteRefs.current[doc.id] = el)}
                className="message-row"
                id={`related-note-${doc.id}`}
              >
                <div
                  className={`message received ${
                    doc.id === noteId ? "selected" : ""
                  }`}
                  style={{
                    borderLeft: doc.id === noteId ? "4px solid #3498db" : "none",
                    border: "solid 1px #555",
                    background: doc.id === noteId ? "#f0f8ff" : "white",
                  }}
                >
                  <div className="message-content">
                    <div className="message-header">
                      <span className="sender-name">{doc.userName}</span>
                      <span
                        className="message-time"
                        title={new Date(doc.timeStamp).toLocaleString()}
                      >
                        {" "}
                        {formatRelativeTime(doc.timeStamp)}{" "}
                      </span>
                    </div>
                    <div className="message-date-below">
                      {formatDate(doc.date)}
                    </div>
                    <div 
                      className="message-text" 
                      dangerouslySetInnerHTML={{ __html: doc.note }} 
                    />
                    
                    {renderNoteImages(doc.id)}
                    
                    {/* Replies are always shown, no button needed */}
                    {renderNoteReplies(doc.id)}
                  </div>
                </div>

                {doc.documentCount > 0 && (
                  <div className="paperclip-container">
                    <button
                      className="paperclip-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewAttachments(doc);
                      }}
                      title={`View ${doc.documentCount} attached file(s)`}
                    >
                      <span className="document-count-badge">
                        ({doc.documentCount}){" "}
                      </span>
                      <i className="fas fa-paperclip" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="whatsapp-footer">
            <button className="close-chat-button" onClick={onClose}>
              <i className="fas fa-times" /> Close
            </button>
          </div>
        </div>
      </div>

     // Add this to your JSX section for the print dialog:
  {showPrintDialog && (
    <div className="print-dialog-overlay" onClick={() => setShowPrintDialog(false)}>
      <div className="print-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Print Notes to PDF</h3>
        {pdfGenerating ? (
          <div className="pdf-generating">
            <i className="fas fa-spinner fa-spin" /> Generating PDF...
          </div>
        ) : (
          <>
            <div className="print-options">
              <div className="print-option-group">
                <label>
                  Maximum number of recent notes:
                  <input
                    type="text"
                    value={maxNotes}
                    onChange={(e) => setMaxNotes(e.target.value)}
                    placeholder="All"
                    className="notes-input"
                  />
                </label>
              </div>
              
            </div>
            
            <div className="buttons">
              <button className="generate-btn" onClick={generatePDF}>
                <i className="fas fa-file-pdf" /> Generate PDF
              </button>
              <button className="cancel-btn" onClick={() => setShowPrintDialog(false)}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )}

      {lightboxOpen && currentLightboxImage && (
        <div className="fullscreen-lightbox">
          <div className="lightbox-background" onClick={closeLightbox}></div>
          
          <div className="lightbox-image-wrapper" ref={lightboxRef}>
            <button className="lightbox-close" onClick={closeLightbox}>
              <i className="fas fa-times" />
            </button>
            
            <div className="lightbox-counter">
              {currentLightboxImage.index + 1} / {currentLightboxImage.total}
            </div>
            
            <img
              src={`${apiUrl}/InlineImages/GetInlineImage/${currentLightboxImage.id}`}
              alt={currentLightboxImage.fileName}
              className="lightbox-full-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/800x600?text=Image+Not+Found";
              }}
            />
            
            {currentLightboxImages.length > 1 && (
              <>
                <button 
                  className="lightbox-nav lightbox-prev" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('prev');
                  }}
                >
                  <i className="fas fa-chevron-left" />
                </button>
                
                <button 
                  className="lightbox-nav lightbox-next" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('next');
                  }}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ViewNoteModal;