import React, { useState, useEffect, useRef } from "react";
import "./ViewNoteModal.css";
import toast from "react-hot-toast";
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

  const renderMixedText = (pdf, text, startX, startY, style = 'normal') => {
    let currentX = startX;
    let run = '';
    let currentFont = 'helvetica';
    pdf.setFont('helvetica', style);
    for (let char of text) {
      const isEth = isEthiopic(char);
      const newFont = isEth ? 'NotoEthiopic' : 'helvetica';

      if (newFont !== currentFont) {
        if (run) {
          pdf.setFont(currentFont, style);
          pdf.text(run, currentX, startY);
          currentX += pdf.getTextWidth(run);
        }
        currentFont = newFont;
        run = char;
      } else {
        run += char;
      }
    }

    if (run) {
      pdf.setFont(currentFont, style);
      pdf.text(run, currentX, startY);
    }
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

          renderMixedText(pdf, line, x + styles.indent, currentY, style);

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
          renderMixedText(pdf, '• ', x + styles.indent - 5, currentY);
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
    const regularFontUrl = 'https://raw.githubusercontent.com/openmaptiles/fonts/master/noto-sans/noto-sans-ethiopic/NotoSansEthiopic-Regular.ttf';
    const boldFontUrl = 'https://raw.githubusercontent.com/twardoch/toto-fonts/master/ttf/sans-bol/_Ethi_/NotoSans-Ethiopic-Bold.ttf';

    const [regularBase64, boldBase64] = await Promise.all([
      fetchFontBase64(regularFontUrl),
      fetchFontBase64(boldFontUrl)
    ]);

    const notesToPrint = relatedNotes.slice(-parseInt(max));

    const pdf = new jsPDF();

    pdf.addFileToVFS('NotoSansEthiopic-Regular.ttf', regularBase64);
    pdf.addFont('NotoSansEthiopic-Regular.ttf', 'NotoEthiopic', 'normal');

    pdf.addFileToVFS('NotoSansEthiopic-Bold.ttf', boldBase64);
    pdf.addFont('NotoSansEthiopic-Bold.ttf', 'NotoEthiopic', 'bold');

    pdf.setFont('helvetica', 'normal');

    // Set initial color to black for headers
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text('Job Notes', 10, 10);

    let headerY = 20;

    pdf.setFontSize(12);
    if (currentNote?.siteNote?.workspace) {
      renderMixedText(pdf, `Workspace: ${currentNote.siteNote.workspace}`, 10, headerY);
      headerY += 6;
    }

    if (currentNote?.siteNote?.project) {
      renderMixedText(pdf, `Project: ${currentNote.siteNote.project}`, 10, headerY);
      headerY += 6;
    }

    if (currentNote?.siteNote?.job) {
      renderMixedText(pdf, `Job: ${currentNote.siteNote.job}`, 10, headerY);
      headerY += 6;
    }

    if (jobDetails) {
      if (jobDetails.type) {
        renderMixedText(pdf, `Type: ${jobDetails.type}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.priorityName && jobDetails.priorityName !== "Unknown") {
        renderMixedText(pdf, `Priority: ${jobDetails.priorityName}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.startDate) {
        renderMixedText(pdf, `Start: ${formatDate(jobDetails.startDate)}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.endDate) {
        renderMixedText(pdf, `End: ${formatDate(jobDetails.endDate)}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.actualEndDate) {
        renderMixedText(pdf, `Actual End: ${formatDate(jobDetails.actualEndDate)}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.managerId != null) {
        let managerText = managerInfo
          ? `${managerInfo.fname || managerInfo.firstName || ''} ${managerInfo.lname || managerInfo.lastName || ''}`.trim()
          : `ID: ${jobDetails.managerId}`;
        if (managerInfo?.email) {
          managerText += ` (${managerInfo.email})`;
        }
        renderMixedText(pdf, `Manager: ${managerText}`, 10, headerY);
        headerY += 6;
      }

      if (jobDetails.createdDate) {
        renderMixedText(pdf, `Created: ${formatDate(jobDetails.createdDate)}`, 10, headerY);
        headerY += 6;
      }
    }

    let y = headerY + 10;
    let lastDate = null;

    for (const note of notesToPrint) {
      const currentDate = formatDate(note.date);

      if (currentDate !== lastDate) {
        // Set gray color for date header (lighter gray - 120,120,120)
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(10);
        pdf.text(currentDate, 105, y, { align: 'center' });
        y += 8;
        lastDate = currentDate;
      }

      // Set gray color for username and timestamp (darker gray - 90,90,90)
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(12);
      renderMixedText(pdf, `${note.userName} - ${formatRelativeTime(note.timeStamp)}`, 10, y);
      y += 6;

      // Reset to black for note content
      pdf.setTextColor(0, 0, 0);
      y = renderFormattedText(pdf, note.note, 10, y);

      if (note.documentCount > 0) {
        // Set medium gray for attachment count (100,100,100)
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text(`Attachments: ${note.documentCount}`, 10, y);
        y += 6;
      }

      const images = noteImages[note.id] || [];
      for (const img of images) {
        try {
          const url = `${apiUrl}/InlineImages/GetInlineImage/${img.id}`;
          const base64 = await getBase64(url);
          if (y + 42 > 270) {
            pdf.addPage();
            y = 10;
          }
          pdf.addImage(base64, 'JPEG', 10, y, 60, 40);
          y += 42;
        } catch (error) {
          if (y + 6 > 270) {
            pdf.addPage();
            y = 10;
          }
          // Set gray for fallback image text
          pdf.setTextColor(120, 120, 120);
          pdf.text(`[Image: ${img.fileName}]`, 10, y);
          y += 6;
        }
      }

      // Add replies to PDF
      if (noteReplies[note.id]) {
        const replies = noteReplies[note.id];
        for (const reply of replies) {
          if (y + 10 > 270) {
            pdf.addPage();
            y = 10;
          }
          
          // Set gray for reply username and timestamp
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(10);
          pdf.text(`↪ ${reply.userName} - ${formatRelativeTime(reply.timeStamp)}`, 15, y);
          y += 5;
          
          // Reset to black for reply content
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          y = renderFormattedText(pdf, reply.note, 15, y);
          
          if (reply.documentCount > 0) {
            // Set medium gray for reply attachment count
            pdf.setTextColor(100, 100, 100);
            pdf.setFontSize(7);
            pdf.text(`Attachments: ${reply.documentCount}`, 15, y);
            y += 4;
          }
          
          const replyImages = noteImages[reply.id] || [];
          for (const img of replyImages) {
            try {
              const url = `${apiUrl}/InlineImages/GetInlineImage/${img.id}`;
              const base64 = await getBase64(url);
              if (y + 35 > 270) {
                pdf.addPage();
                y = 10;
              }
              pdf.addImage(base64, 'JPEG', 15, y, 50, 35);
              y += 37;
            } catch (error) {
              if (y + 5 > 270) {
                pdf.addPage();
                y = 10;
              }
              // Set gray for fallback reply image text
              pdf.setTextColor(120, 120, 120);
              pdf.text(`[Image: ${img.fileName}]`, 15, y);
              y += 5;
            }
          }
          
          y += 6;
        }
      }

      y += 8;

      if (y > 270) {
        pdf.addPage();
        y = 10;
      }
    }

    pdf.save(`notes_${jobId || noteId}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF");
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
{/* 
              <button className="header-button">
                <i className="fas fa-ellipsis-v" />
              </button> */}
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
                <label>
                  Maximum number of recent notes:
                  <input
                    type="text"
                    value={maxNotes}
                    onChange={(e) => setMaxNotes(e.target.value)}
                    placeholder="All"
                  />
                </label>
                <div className="buttons">
                  <button onClick={generatePDF}>Generate PDF</button>
                  <button onClick={() => setShowPrintDialog(false)}>Cancel</button>
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