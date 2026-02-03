import React, { useState, useEffect, useCallback, useRef } from "react";
import "./EditNoteModal.css";
import toast from "react-hot-toast";
import 'emoji-picker-element';

const EditNoteModal = ({
  note,
  onClose,
  refreshNotes,
  updateNote,
  defaultWorkspaceId,
  fetchNotesWithFilters,
  selectedFilters,
  hasActiveFilters
}) => {
  const [isEditable, setIsEditable] = useState(true);
  const [journalData, setJournalData] = useState({
    date: "",
    userId: "",
    projectId: "",
    jobId: "",
    note: "",
    workspaceId: "",
  });

  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: "",
    file: null,
  });

  const [activeTab, setActiveTab] = useState("journal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState("1");
  const [priorityId, setPriorityId] = useState(null);
  const [isLoadingPriority, setIsLoadingPriority] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDownloadingFileName, setCurrentDownloadingFileName] = useState('');

  const modalRef = useRef(null);
  const editorContainerRef = useRef(null);

  // Rich text editor states 
  const [richTextContent, setRichTextContent] = useState('');
  const [originalNoteContent, setOriginalNoteContent] = useState('');
  const [pastedImages, setPastedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [fullscreenImages, setFullscreenImages] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const editorRef = useRef(null);
  const isInitialLoad = useRef(true);
  const lastRichTextContent = useRef('');
  const hasSetContent = useRef(false);
  const hasFocused = useRef(false);
  const hasScrolledToEditor = useRef(false);
  
  // NEW: Add flags to track if data has been fetched
  const hasFetchedData = useRef(false);
  const isFetchingData = useRef(false);

  // Emoji picker states - ADDED
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Get current user
  const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || { id: 1 };
  };

  // Permission logic - only creator can edit
  const currentUser = getCurrentUser();
  const isCreator = note?.userId && note.userId.toString() === currentUser.id.toString();
  const canEditNote = isCreator;

  const allowedFileTypes = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    "text/plain": [".txt"],
    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/ogg": [".ogg"],
    "audio/aac": [".aac"],
    "video/mp4": [".mp4"],
    "video/mpeg": [".mpeg"],
    "video/ogg": [".ogv"],
    "video/webm": [".webm"],
    "video/quicktime": [".mov"],
    "video/x-msvideo": [".avi"],
  };

  const isValidFileType = (file) => Object.keys(allowedFileTypes).includes(file.type);

  // Initialize emoji picker - ADDED
  useEffect(() => {
    if (emojiPickerRef.current && canEditNote && isEditable) {
      let handleClickOutside;
      
      if (emojiPickerRef.current) {
        const handleEmojiClick = (event) => {
          console.log('Emoji click event received:', event);
          console.log('Event type:', event.type);
          console.log('Event detail:', event.detail);
          console.log('Event target:', event.target);
          
          if (!editorRef.current || !canEditNote || !isEditable) return;
          
          let emojiChar = '';
          
          if (event.detail) {
            console.log('event.detail structure:', event.detail);
            
            if (typeof event.detail === 'string') {
              emojiChar = event.detail;
              console.log('Found string emoji:', emojiChar);
            } else if (event.detail.unicode) {
              emojiChar = event.detail.unicode;
              console.log('Found unicode emoji:', emojiChar);
            } else if (event.detail.native) {
              emojiChar = event.detail.native;
              console.log('Found native emoji:', emojiChar);
            } else if (event.detail.emoji) {
              emojiChar = event.detail.emoji;
              console.log('Found emoji property:', emojiChar);
            } else {
              const str = JSON.stringify(event.detail);
              console.log('Stringified detail:', str);
              
              const emojiMatch = str.match(/["']?([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])["']?/u);
              if (emojiMatch) {
                emojiChar = emojiMatch[1];
                console.log('Extracted emoji from string:', emojiChar);
              }
            }
          }
          
          if (!emojiChar && event.target) {
            console.log('Trying to get emoji from target:', event.target);
            
            if (event.target.getAttribute('data-emoji')) {
              emojiChar = event.target.getAttribute('data-emoji');
              console.log('Found emoji in data-emoji:', emojiChar);
            } else if (event.target.textContent) {
              const text = event.target.textContent.trim();
              const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
              const match = text.match(emojiRegex);
              if (match) {
                emojiChar = match[0];
                console.log('Found emoji in textContent:', emojiChar);
              }
            }
          }
          
          if (!emojiChar) {
            emojiChar = '❓';
            console.log('Using fallback emoji');
          }
          
          console.log('Final emoji character to insert:', emojiChar);
          
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const emojiNode = document.createTextNode(emojiChar);
            range.deleteContents();
            range.insertNode(emojiNode);
            
            range.setStartAfter(emojiNode);
            range.setEndAfter(emojiNode);
            selection.removeAllRanges();
            selection.addRange(range);
            
            setRichTextContent(editorRef.current.innerHTML);
            lastRichTextContent.current = editorRef.current.innerHTML;
          }
          
          setShowEmojiPicker(false);
          
          if (editorRef.current) {
            editorRef.current.focus();
          }
        };
        
        emojiPickerRef.current.addEventListener('emoji-click', handleEmojiClick);
        
        emojiPickerRef.current._handleEmojiClick = handleEmojiClick;
        
        handleClickOutside = (event) => {
          if (showEmojiPicker && 
              emojiButtonRef.current && 
              !emojiButtonRef.current.contains(event.target) &&
              emojiPickerRef.current && 
              !emojiPickerRef.current.contains(event.target)) {
            setShowEmojiPicker(false);
          }
        };

        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        if (emojiPickerRef.current && emojiPickerRef.current._handleEmojiClick) {
          emojiPickerRef.current.removeEventListener('emoji-click', emojiPickerRef.current._handleEmojiClick);
          delete emojiPickerRef.current._handleEmojiClick;
        }
        
        if (handleClickOutside) {
          document.removeEventListener('mousedown', handleClickOutside);
        }
      };
    }
  }, [showEmojiPicker, canEditNote, isEditable]);

  // Fetch priority by note ID
  const fetchPriorityByNoteId = useCallback(async (noteId) => {
    if (!noteId) return null;
    
    setIsLoadingPriority(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Priority/GetPriorityByNoteId/${noteId}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No priority found for note ${noteId}, using default (1)`);
          setSelectedPriority("1");
          setPriorityId(null);
          return null;
        }
        throw new Error(`Failed to fetch priority: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Priority data fetched:', data);
      
      if (data.priority) {
        setSelectedPriority(data.priority.priorityValue?.toString() || "1");
        setPriorityId(data.priority.id?.toString() || null);
      } else if (data.priorityValue) {
        setSelectedPriority(data.priorityValue.toString());
        setPriorityId(data.id?.toString() || null);
      } else if (Array.isArray(data) && data.length > 0) {
        const priority = data[0];
        setSelectedPriority(priority.priorityValue?.toString() || "1");
        setPriorityId(priority.id?.toString() || null);
      } else {
        setSelectedPriority("1");
        setPriorityId(null);
      }
      
      return data;
    } catch (error) {
      console.error("Error fetching priority:", error);
      setSelectedPriority("1");
      setPriorityId(null);
      return null;
    } finally {
      setIsLoadingPriority(false);
    }
  }, []);

  // Fetch inline images for the note
  const fetchInlineImages = useCallback(async (siteNoteId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/InlineImages/GetInlineImagesBySiteNote?siteNoteId=${siteNoteId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.images && Array.isArray(data.images)) {
        return data.images;
      }
      return [];
    } catch (error) {
      console.error("Error fetching inline images:", error);
      return [];
    }
  }, []);

  const fetchDocumentsByReference = useCallback(async (referenceId) => {
    try {
      setIsLoadingDocuments(true);
      setError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/Documents/GetDocumentMetadataByReference?siteNoteId=${referenceId}`,
        { headers: { accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
      }

      var docs = await response.json();
      docs = docs.documents || docs;

      const formattedDocs = docs.map((doc) => {
        const downloadApiTriggerUrl = `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${doc.id}`;
        return {
          ...doc,
          fileType: doc.fileName?.split(".").pop(),
          fileUrl: null,
          downloadApiTriggerUrl,
        };
      });
      
      setDocuments(formattedDocs);
      return formattedDocs;
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents: " + error.message);
      return [];
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  // Fetch all data for note - optimized single function
  const fetchAllNoteData = useCallback(async (noteData) => {
    if (!noteData?.id || hasFetchedData.current || isFetchingData.current) return;
    
    isFetchingData.current = true;
    console.log('Fetching all note data for note:', noteData.id);
    
    try {
      const [priorityData, imagesData, documentsData] = await Promise.all([
        fetchPriorityByNoteId(noteData.id),
        fetchInlineImages(noteData.id),
        fetchDocumentsByReference(noteData.id)
      ]);
      
      console.log('All data fetched:', { priorityData, imagesData, documentsData });
      
      if (imagesData && Array.isArray(imagesData)) {
        setExistingImages(imagesData);
      }
      
    } catch (error) {
      console.error('Error fetching note data:', error);
    } finally {
      isFetchingData.current = false;
      hasFetchedData.current = true;
    }
  }, [fetchPriorityByNoteId, fetchInlineImages, fetchDocumentsByReference]);

  // Check if note is editable based on creation time
  useEffect(() => {
    if (note) {
      const creationDate = note.timeStamp;
      if (creationDate) {
        const createdAt = new Date(creationDate);
        const now = new Date();
        const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          setIsEditable(false);
        } else {
          setIsEditable(true);
        }
      } else {
        setIsEditable(true);
      }
    }
  }, [note]);

  const placeCursorAtEnd = (element) => {
    if (!element) return;
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (element.childNodes.length > 0) {
      let lastNode = element.lastChild;
      
      while (lastNode && lastNode.nodeType === Node.ELEMENT_NODE && lastNode.lastChild) {
        lastNode = lastNode.lastChild;
      }
      
      if (lastNode.nodeType === Node.TEXT_NODE) {
        range.setStart(lastNode, lastNode.length);
        range.setEnd(lastNode, lastNode.length);
      } else {
        range.setStartAfter(lastNode);
        range.setEndAfter(lastNode);
      }
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const focusEditorAtEnd = () => {
    if (editorRef.current && document.contains(editorRef.current)) {
      editorRef.current.focus();
      placeCursorAtEnd(editorRef.current);
      hasFocused.current = true;
      return true;
    }
    return false;
  };

  const scrollModalToEditor = () => {
    if (editorContainerRef.current && modalRef.current) {
      const editorRect = editorContainerRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      const modalScrollTop = modalRef.current.scrollTop;
      
      const editorTopRelativeToModal = editorRect.top - modalRect.top + modalScrollTop;
      
      modalRef.current.scrollTo({
        top: editorTopRelativeToModal - 100,
        behavior: 'smooth'
      });
      
      hasScrolledToEditor.current = true;
    }
  };

  // Load note data - MAIN EFFECT - optimized
  useEffect(() => {
    if (note && !hasFetchedData.current) {
      let correctedDate = "";
      if (note.date) {
        const dateObj = new Date(note.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        correctedDate = `${year}-${month}-${day}`;
      }
      
      const user = JSON.parse(localStorage.getItem("user"));

      setJournalData({
        date: correctedDate,
        projectId: note.projectId?.toString() || "",
        jobId: note.jobId?.toString() || "",
        note: note.note || "",
        userId: user.id,
        workspaceId: note.workspaceId?.toString() || ""
      });

      setOriginalNoteContent(note.note || '');
      
      fetchAllNoteData(note);
      
      let content = note.note || '';
      
      if (content && !content.includes('<') && !content.includes('>')) {
        content = `<div>${content}</div>`;
      }
      
      setRichTextContent(content);
      lastRichTextContent.current = content;
      
      const setEditorContent = () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = content;
          hasSetContent.current = true;
          
          setTimeout(() => {
            if (editorRef.current && !hasScrolledToEditor.current) {
              scrollModalToEditor();
              setTimeout(() => {
                if (!hasFocused.current) {
                  focusEditorAtEnd();
                }
              }, 300);
            }
          }, 300);
        } else {
          setTimeout(setEditorContent, 100);
        }
      };
      
      setEditorContent();
    }
    
    return () => {
      hasFetchedData.current = false;
      isFetchingData.current = false;
      hasFocused.current = false;
      hasSetContent.current = false;
      hasScrolledToEditor.current = false;
    };
  }, [note, fetchAllNoteData]);

  // Update editor content with images when existingImages are loaded
  useEffect(() => {
    if (existingImages.length > 0 && editorRef.current && hasSetContent.current) {
      const content = editorRef.current.innerHTML;
      
      const hasImages = content.includes('image-wrapper');
      if (!hasImages) {
        const imageHtml = existingImages.map(img => {
          const imageUrl = img.url.startsWith('http') ? img.url : 
            `${process.env.REACT_APP_API_BASE_URL}${img.url}`;
          return `
            <div class="image-wrapper" data-image-id="${img.id}" data-image-url="${imageUrl}" data-image-name="${img.fileName}">
              <img src="${imageUrl}" 
                   alt="${img.fileName}" 
                   class="inline-image" />
              <button type="button" class="remove-image-btn" title="Remove image">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        }).join('');
        
        const newContent = content + imageHtml;
        editorRef.current.innerHTML = newContent;
        setRichTextContent(newContent);
        lastRichTextContent.current = newContent;
        
        addImageClickHandlers();
      }
    }
  }, [existingImages]);

  // Set editor content when tab changes to journal
  useEffect(() => {
    if (activeTab === "journal" && editorRef.current && richTextContent) {
      setTimeout(() => {
        if (editorRef.current) {
          const contentToRestore = richTextContent || lastRichTextContent.current;
          if (contentToRestore && editorRef.current.innerHTML !== contentToRestore) {
            editorRef.current.innerHTML = contentToRestore;
            hasSetContent.current = true;
            addImageClickHandlers();
            
            if (canEditNote && isEditable) {
              setTimeout(() => {
                scrollModalToEditor();
                setTimeout(() => {
                  if (!hasFocused.current) {
                    focusEditorAtEnd();
                  }
                }, 200);
              }, 100);
            } else {
              setTimeout(() => {
                scrollModalToEditor();
              }, 100);
            }
          }
        }
      }, 50);
    }
  }, [activeTab, richTextContent, canEditNote, isEditable]);

  // Focus editor when modal opens and content is loaded
  useEffect(() => {
    if (note && editorRef.current && hasSetContent.current && !hasFocused.current) {
      const timeout1 = setTimeout(() => {
        scrollModalToEditor();
        setTimeout(() => focusEditorAtEnd(), 200);
      }, 200);
      
      return () => clearTimeout(timeout1);
    }
  }, [note, hasSetContent.current]);

  // Add click handlers to images for fullscreen view
  const addImageClickHandlers = useCallback(() => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll('.image-wrapper img');
    images.forEach((img, index) => {
      img.style.cursor = 'zoom-in';
      img.onclick = (e) => {
        e.stopPropagation();
        const wrapper = img.closest('.image-wrapper');
        const imageUrl = wrapper?.dataset.imageUrl;
        const imageName = wrapper?.dataset.imageName || 'Image';
        
        if (imageUrl) {
          const allImageWrappers = editorRef.current.querySelectorAll('.image-wrapper');
          const imagesArray = Array.from(allImageWrappers).map(wrapper => ({
            url: wrapper.dataset.imageUrl,
            name: wrapper.dataset.imageName || 'Image'
          }));
          
          const currentIndex = Array.from(allImageWrappers).findIndex(wrapper => 
            wrapper.dataset.imageUrl === imageUrl
          );
          
          setFullscreenImages(imagesArray);
          setFullscreenImageIndex(currentIndex >= 0 ? currentIndex : 0);
          setShowFullscreenImage(true);
        }
      };
    });
  }, []);

  const handleJournalChange = (e) => {
    if (!isEditable || !canEditNote) return;
    const { name, value } = e.target;
    setJournalData((prev) => ({ ...prev, [name]: value }));
  };

  // Process pasted image
  const processPastedImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target.result;
        const imageId = `new-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const imageName = file.name || `image-${Date.now()}.png`;
        
        const imageHtml = `
          <div class="image-wrapper" data-image-id="${imageId}" data-image-url="${base64Image}" data-image-name="${imageName}">
            <img src="${base64Image}" 
                 alt="${imageName}" 
                 class="inline-image" />
            <button type="button" class="remove-image-btn" title="Remove image">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        
        setPastedImages(prev => [...prev, {
          id: imageId,
          name: imageName,
          base64: base64Image,
          type: file.type,
          size: file.size,
          isNew: true
        }]);
        
        resolve(imageHtml);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle paste
  const handlePaste = useCallback((e) => {
    if (!editorRef.current || !canEditNote || !isEditable) return;
    
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      
      if (file.type.startsWith('image/')) {
        processPastedImage(file).then((imageHtml) => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            const previousNode = range.startContainer;
            if (previousNode.nodeType === Node.TEXT_NODE && 
                previousNode.textContent && 
                !previousNode.textContent.endsWith('\n')) {
              const br = document.createElement('br');
              range.insertNode(br);
            }
            
            const fragment = range.createContextualFragment(imageHtml);
            range.deleteContents();
            range.insertNode(fragment);
            
            const br = document.createElement('br');
            range.insertNode(br);
            
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          const newContent = editorRef.current.innerHTML;
          setRichTextContent(newContent);
          lastRichTextContent.current = newContent;
          setTimeout(() => addImageClickHandlers(), 100);
          
          toast.success('Image added - will be saved separately');
        }).catch(error => {
          console.error('Error processing pasted image:', error);
          document.execCommand('insertText', false, '');
          const newContent = editorRef.current.innerHTML;
          setRichTextContent(newContent);
          lastRichTextContent.current = newContent;
        });
        return;
      }
    }
    
    const pastedText = clipboardData.getData('text');
    if (pastedText) {
      document.execCommand('insertText', false, pastedText);
      const newContent = editorRef.current.innerHTML;
      setRichTextContent(newContent);
      lastRichTextContent.current = newContent;
    }
  }, [canEditNote, isEditable, addImageClickHandlers]);

  // Handle editor input
  const handleEditorInput = useCallback((e) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      const currentContent = richTextContent || lastRichTextContent.current;
      
      if (newContent !== currentContent) {
        setRichTextContent(newContent);
        lastRichTextContent.current = newContent;
      }
    }
  }, [richTextContent]);

  // Handle image upload
  const handleImageUpload = useCallback((e) => {
    if (!canEditNote || !isEditable) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    processPastedImage(file).then((imageHtml) => {
      if (editorRef.current) {
        const br = document.createElement('br');
        editorRef.current.appendChild(br);
        
        const fragment = document.createRange().createContextualFragment(imageHtml);
        editorRef.current.appendChild(fragment);
        
        editorRef.current.appendChild(br.cloneNode());
        
        const newContent = editorRef.current.innerHTML;
        setRichTextContent(newContent);
        lastRichTextContent.current = newContent;
        
        setTimeout(() => addImageClickHandlers(), 100);
        
        editorRef.current.scrollTop = editorRef.current.scrollHeight;
        
        toast.success('Image added - will be saved separately');
      }
    }).catch(error => {
      console.error('Error uploading image:', error);
      toast.error('Failed to add image');
    });
    
    e.target.value = '';
  }, [canEditNote, isEditable, addImageClickHandlers]);

  const formatText = (command, value = null) => {
    if (!canEditNote || !isEditable) return;
    
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setRichTextContent(newContent);
      lastRichTextContent.current = newContent;
      
      setTimeout(() => {
        if (editorRef.current) {
          focusEditorAtEnd();
        }
      }, 10);
    }
  };

  // Clear editor
  const clearEditor = () => {
    if (!canEditNote || !isEditable) return;
    
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setRichTextContent('');
      lastRichTextContent.current = '';
    }
    setPastedImages([]);
  };

  // Handle image deletion confirmation
  const handleDeleteImageClick = useCallback((imageId) => {
    if (!canEditNote || !isEditable) return;
    
    const image = existingImages.find(img => img.id.toString() === imageId.toString());
    const newImage = pastedImages.find(img => img.id === imageId);
    
    setImageToDelete({
      id: imageId,
      name: image?.fileName || newImage?.name || 'Image'
    });
    setShowDeleteConfirm(true);
  }, [canEditNote, isEditable, existingImages, pastedImages]);

  // Handle actual image deletion after confirmation
  const confirmDeleteImage = () => {
    if (!imageToDelete) return;
    
    const imageId = imageToDelete.id;
    
    const image = existingImages.find(img => img.id.toString() === imageId.toString());
    if (image && image.id) {
      setImagesToDelete(prev => [...prev, image.id]);
    }
    
    if (editorRef.current) {
      const imgWrapper = editorRef.current.querySelector(`.image-wrapper[data-image-id="${imageId}"]`);
      if (imgWrapper) {
        imgWrapper.remove();
        const newContent = editorRef.current.innerHTML;
        setRichTextContent(newContent);
        lastRichTextContent.current = newContent;
      }
    }
    
    setExistingImages(prev => prev.filter(img => img.id.toString() !== imageId.toString()));
    setPastedImages(prev => prev.filter(img => img.id !== imageId));
    
    setShowDeleteConfirm(false);
    setImageToDelete(null);
    
    toast.success('Image marked for deletion');
  };

  // Handle remove button clicks inside editor
  useEffect(() => {
    const handleRemoveClick = (e) => {
      const removeBtn = e.target.closest('.remove-image-btn');
      if (removeBtn) {
        e.stopPropagation();
        const wrapper = removeBtn.closest('.image-wrapper');
        const imageId = wrapper?.dataset.imageId;
        if (imageId) {
          handleDeleteImageClick(imageId);
        }
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('click', handleRemoveClick);
      return () => editor.removeEventListener('click', handleRemoveClick);
    }
  }, [handleDeleteImageClick]);

  // Fullscreen image navigation
  const handlePrevImage = () => {
    setFullscreenImageIndex(prev => 
      prev > 0 ? prev - 1 : fullscreenImages.length - 1
    );
  };

  const handleNextImage = () => {
    setFullscreenImageIndex(prev => 
      prev < fullscreenImages.length - 1 ? prev + 1 : 0
    );
  };

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showFullscreenImage) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          handlePrevImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
        case 'Escape':
          setShowFullscreenImage(false);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreenImage, fullscreenImages.length]);

  // Upload inline image
  const uploadInlineImage = async (doc, siteNoteId, userId) => {
    if (!doc.file) {
      throw new Error('No file selected for upload');
    }

    const formData = new FormData();
    formData.append('File', doc.file);
    formData.append('SiteNoteId', siteNoteId);
    formData.append('UserId', userId);
    
    if (doc.name) {
      formData.append('Description', doc.name);
    }
   
    console.log('Uploading inline image:', {
      fileName: doc.file.name,
      fileSize: doc.file.size,
      siteNoteId,
      userId
    });

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/InlineImages/UploadInlineImage`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Image upload failed';
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.errors?.File?.[0] || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      console.error('Inline image upload failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Inline image upload success:', result);
    return result;
  };

  // Delete inline image
  const deleteInlineImage = async (imageId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/InlineImages/DeleteInlineImage/${imageId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting inline image:", error);
      throw error;
    }
  };

  // Helper function to clean note content
  const cleanNoteContent = (content) => {
    if (!content || content.trim() === '') return '';
    
    content = content.replace(/<br\s*\/?>$/gi, '');
    content = content.replace(/<(p|div)>\s*<\/\1>$/gi, '');
    content = content.trim();
    
    return content;
  };

  // Prepare note content for saving - remove images completely
  const prepareNoteContent = () => {
    if (editorRef.current) {
      let htmlContent = editorRef.current.innerHTML;
      
      if (!htmlContent || htmlContent.trim() === '') {
        return '';
      }
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      const imageWrappers = tempDiv.querySelectorAll('.image-wrapper');
      imageWrappers.forEach(wrapper => {
        wrapper.remove();
      });
      
      const cleanupEmptyElements = (element) => {
        Array.from(element.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() === '') {
            child.remove();
          }
        });
        
        const emptyElements = element.querySelectorAll('div, p, span, br');
        emptyElements.forEach(el => {
          const hasContent = el.textContent && el.textContent.trim() !== '';
          const hasChildren = el.children && el.children.length > 0;
          
          if (!hasContent && !hasChildren) {
            el.remove();
          } else if (el.tagName === 'BR' && !el.nextSibling && !el.previousSibling) {
            el.remove();
          }
        });
      };
      
      cleanupEmptyElements(tempDiv);
      
      htmlContent = tempDiv.innerHTML.trim();
      
      if (!htmlContent || htmlContent === '<br>' || htmlContent === '<div></div>' || 
          htmlContent === '<p></p>' || htmlContent === '<span></span>') {
        return '';
      }
      
      return htmlContent;
    }
    
    let content = richTextContent || lastRichTextContent.current || originalNoteContent || '';
    
    if (!content || content.trim() === '') {
      return '';
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const imageWrappers = tempDiv.querySelectorAll('.image-wrapper');
    imageWrappers.forEach(wrapper => wrapper.remove());
    
    const cleanupEmptyElements = (element) => {
      Array.from(element.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() === '') {
          child.remove();
        }
      });
      
      const emptyElements = element.querySelectorAll('div, p, span, br');
      emptyElements.forEach(el => {
        const hasContent = el.textContent && el.textContent.trim() !== '';
        const hasChildren = el.children && el.children.length > 0;
        
        if (!hasContent && !hasChildren) {
          el.remove();
        } else if (el.tagName === 'BR' && !el.nextSibling && !el.previousSibling) {
          el.remove();
        }
      });
    };
    
    cleanupEmptyElements(tempDiv);
    
    let htmlContent = tempDiv.innerHTML.trim();
    
    if (!htmlContent || htmlContent === '<br>' || htmlContent === '<div></div>' || 
        htmlContent === '<p></p>' || htmlContent === '<span></span>') {
      return '';
    }
    
    return htmlContent;
  };

  // Handle save note
  const handleSaveNote = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let noteIdToReturn = note.id;
      
      if (!canEditNote) {
        if (priorityId) {
          await handleUpdatepriority();
        }
        onClose(noteIdToReturn);
        return;
      }

      if (!isEditable) {
        if (priorityId) {
          await handleUpdatepriority();
        }
        onClose(noteIdToReturn);
        return;
      }

      let noteText = prepareNoteContent();
      noteText = cleanNoteContent(noteText);

      const hasTextContent = noteText.replace(/<[^>]*>/g, '').trim().length > 0;
      const hasImages = pastedImages.length > 0;
      
      if (!hasTextContent && !hasImages) {
        setError("Note content is required");
        setIsSubmitting(false);
        return;
      }

      const result = await updateNote(note.id, {
        Date: new Date(journalData.date).toISOString(),
        Note: noteText,
        JobId: journalData.jobId,
        UserId: journalData.userId,
      });

      if (result && (result.success || result.id || result.message)) {
        const user = getCurrentUser();
        
        for (const imageId of imagesToDelete) {
          try {
            await deleteInlineImage(imageId);
            console.log(`Deleted image ${imageId}`);
          } catch (err) {
            console.error(`Error deleting image ${imageId}:`, err);
            toast.error(`Failed to delete image: ${err.message}`);
          }
        }
        
        if (pastedImages.length > 0) {
          const imageUploadPromises = pastedImages.map(async (image, index) => {
            try {
              const base64Response = await fetch(image.base64);
              const blob = await base64Response.blob();
              
              const file = new File([blob], image.name, { type: image.type });
              
              const imageDoc = {
                name: image.name,
                file: file,
                fileName: image.name
              };
              
              console.log(`Uploading new image "${image.name}" to inline images endpoint...`);
              const imageResult = await uploadInlineImage(imageDoc, note.id, user.id);
              console.log(`Image "${image.name}" uploaded successfully with ID:`, imageResult.id);
              
              return { success: true, name: image.name };
            } catch (imageError) {
              console.error('Error uploading pasted image:', imageError);
              return { 
                success: false, 
                name: image.name, 
                error: imageError.message 
              };
            }
          });
          
          const results = await Promise.all(imageUploadPromises);
          
          const failedUploads = results.filter(r => !r.success);
          if (failedUploads.length > 0) {
            console.warn(`${failedUploads.length} image(s) failed to upload:`, failedUploads);
            toast.error(`${failedUploads.length} image(s) failed to upload`);
          }
          
          const successfulUploads = results.filter(r => r.success);
          if (successfulUploads.length > 0) {
            toast.success(`${successfulUploads.length} image(s) uploaded successfully`);
          }
        }
        
        if (priorityId) {
          await handleUpdatepriority();
        }
        onClose(noteIdToReturn);
        
        if (hasActiveFilters && fetchNotesWithFilters) {
          await fetchNotesWithFilters(selectedFilters);
        } else {
          await refreshNotes();
        }
        
        toast.success('Note updated successfully!');
      } else {
        throw new Error("Failed to save note: No success confirmation from server");
      }
    } catch (err) {
      console.error("Error saving note:", err);
      setError(err.message || "Failed to save note. Please check your connection and try again.");
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveShortcut = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!isSubmitting && canEditNote && isEditable) {
        handleSaveNote();
      }
    }
  }, [isSubmitting, handleSaveNote, canEditNote, isEditable]);

  useEffect(() => {
    document.addEventListener('keydown', handleSaveShortcut);
    return () => {
      document.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [handleSaveShortcut]);

  useEffect(() => {
    if (!error) return;
    try {
      if (modalRef.current) {
        if (typeof modalRef.current.scrollTo === 'function') {
          modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          modalRef.current.scrollTop = 0;
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
      }
    }
  }, [error]);

  const handleUpdatepriority = async () => {
    if (!priorityId) {
      console.log('No priority ID, skipping priority update');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Priority/UpdatePriority/${priorityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          priorityValue: selectedPriority,
          userId: user.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update priority`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error(error.message || "Failed to update priority");
      throw error;
    }
  };

  const handleAddDocument = () => {
    if (!isEditable || !canEditNote) return;
    setNewDocument({ name: "", file: null });
    setShowDocumentModal(true);
    setError(null);
  };

  const handleDocumentFileChange = (e) => {
    if (!isEditable || !canEditNote) return;
    
    const file = e.target.files[0];
    setError("");
    if (!file) return;
    if (!isValidFileType(file)) {
      setError("Invalid file type! ");
      return;
    }
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    setNewDocument(prev => ({ ...prev, file, name: !prev.name.trim() ? fileNameWithoutExt : prev.name }));
  };

  const handleDocumentSubmit = async () => {
    if (!isEditable || !canEditNote) {
      setError("Cannot add documents to notes older than 24 hours or you don't have permission");
      return;
    }

    if (!newDocument.name.trim()) {
      setError("Document name is required.");
      return;
    }
    if (!newDocument.file) {
      setError("Please select a file to upload.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const user = getCurrentUser();
      const formData = new FormData();
      formData.append("Name", newDocument.name.trim());
      formData.append("File", newDocument.file);
      formData.append("SiteNoteId", note.id);
      formData.append("UserId", user?.id || 1);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/AddDocument`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.errors?.Name?.[0] || "Upload failed");
      }

      const result = await response.json();
      const savedDoc = result.document || result;

      const newDocEntry = {
        ...savedDoc,
        name: newDocument.name.trim(),
        fileName: newDocument.file.name,
        downloadApiTriggerUrl: `${process.env.REACT_APP_API_BASE_URL}/api/Documents/DownloadDocument/${savedDoc.id}`
      };

      setDocuments(prev => [...prev, newDocEntry]);

      setShowDocumentModal(false);
      setNewDocument({ name: "", file: null });
      setIsUploading(false);
      toast.success("Document uploaded successfully!");
    } catch (err) {
      setError(err.message || "Upload failed");
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = (doc) => {
    setError('');
    setIsSubmitting(true);
    setIsDownloading(true);
    setCurrentDownloadingFileName(doc.fileName || 'file');

    const a = document.createElement('a');
    a.href = doc.downloadApiTriggerUrl;
    a.download = doc.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setIsDownloading(false);
      setIsSubmitting(false);
    }, 1000);
  };
  
const handlePriorityClick = () => {
  if (!canEditNote || !isEditable) return;
  
  // Cycle through priority levels: 1 → 3 → 4 → 5 → 1
  let nextPriority;
  if (selectedPriority === '1') {
    nextPriority = '3'; // Medium
  } else if (selectedPriority === '3') {
    nextPriority = '4'; // High
  } else if (selectedPriority === '4') {
    nextPriority = '5'; // Completed
  } else {
    nextPriority = '1'; // No priority
  }
  
  setSelectedPriority(nextPriority);
  
  // Update toast message for completed priority
  let priorityText;
  if (nextPriority === '5') {
    priorityText = 'Completed';
  } else if (nextPriority === '4') {
    priorityText = 'High';
  } else if (nextPriority === '3') {
    priorityText = 'Medium';
  } else {
    priorityText = 'No Priority';
  }
  
  toast.success(`Priority set to ${priorityText}`);
};

  // Editor toolbar component with emoji picker - UPDATED
  const renderEditorToolbar = () => (
    <div className="editor-toolbar">
      <div className="editor-formatting-tools">
        <button 
          onClick={() => formatText('bold')} 
          title="Bold"
          disabled={!isEditable || !canEditNote}
          className={!isEditable || !canEditNote ? 'disabled' : ''}
        >
          <i className="fas fa-bold"></i>
        </button>
        <button 
          onClick={() => formatText('italic')} 
          title="Italic"
          disabled={!isEditable || !canEditNote}
          className={!isEditable || !canEditNote ? 'disabled' : ''}
        >
          <i className="fas fa-italic"></i>
        </button>
        <button 
          onClick={() => formatText('underline')} 
          title="Underline"
          disabled={!isEditable || !canEditNote}
          className={!isEditable || !canEditNote ? 'disabled' : ''}
        >
          <i className="fas fa-underline"></i>
        </button>
        <button 
          onClick={() => formatText('insertUnorderedList')} 
          title="Bullet List"
          disabled={!isEditable || !canEditNote}
          className={!isEditable || !canEditNote ? 'disabled' : ''}
        >
          <i className="fas fa-list-ul"></i>
        </button>
        <button 
          onClick={() => formatText('insertOrderedList')} 
          title="Numbered List"
          disabled={!isEditable || !canEditNote}
          className={!isEditable || !canEditNote ? 'disabled' : ''}
        >
          <i className="fas fa-list-ol"></i>
        </button>
        
        {/* Emoji Picker Button - ADDED */}
        <div className="emoji-picker-wrapper" style={{ position: 'relative' }}>
          <button 
            ref={emojiButtonRef}
            onClick={() => canEditNote && isEditable && setShowEmojiPicker(!showEmojiPicker)}
            title={!isEditable || !canEditNote ? "View only - Cannot add emojis" : "Insert Emoji"}
            className={`emoji-button ${showEmojiPicker ? 'active' : ''} ${!isEditable || !canEditNote ? 'disabled' : ''}`}
            disabled={!isEditable || !canEditNote}
            type="button"
          >
            <i className="far fa-smile"></i>
          </button>
          
          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && canEditNote && isEditable && (
            <div className="emoji-picker-container">
              <emoji-picker 
                ref={emojiPickerRef}
                class="emoji-picker"
                style={{
                  '--background': '#ffffff',
                  '--border-color': '#e0e0e0',
                  '--border-radius': '8px',
                  '--button-active-background': '#f0f0f0',
                  '--button-hover-background': '#f5f5f5',
                  '--category-emoji-padding': '8px',
                  '--category-emoji-size': '24px',
                  '--category-font-color': '#666',
                  '--category-font-size': '13px',
                  '--indicator-color': '#007bff',
                  '--input-border-color': '#e0e0e0',
                  '--input-border-radius': '20px',
                  '--input-font-color': '#333',
                  '--input-placeholder-color': '#999',
                  '--num-columns': '8',
                  '--outline-color': '#007bff80',
                  width: '350px',
                  height: '400px'
                }}
              ></emoji-picker>
            </div>
          )}
        </div>
        
        <div className="image-upload-wrapper">
          <label 
            htmlFor="image-upload" 
            className={`image-upload-button ${!isEditable || !canEditNote ? 'disabled' : ''}`} 
            title={!isEditable || !canEditNote ? "View only - Cannot upload images" : "Upload Image"}
          >
            <i className="fas fa-image"></i>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={!isEditable || !canEditNote}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <div className="documents-button-wrapper" style={{ position: 'relative' }}>
          <button 
            onClick={() => setActiveTab('documents')} 
            title={`${documents.length} document${documents.length !== 1 ? 's' : ''} attached`}
            className={`documents-button ${activeTab === 'documents' ? 'active' : ''} ${!isEditable || !canEditNote ? 'disabled' : ''}`}
            disabled={!isEditable || !canEditNote}
          >
            <i className="fas fa-paperclip"></i>
            {documents.length > 0 && (
              <span className="documents-badge">
                {documents.length}
              </span>
            )}
          </button>
        </div>
        
        <div className="priority-flag-container">
  <button 
    onClick={(e) => {
      e.stopPropagation();
      handlePriorityClick();
    }}
    title={`${selectedPriority === '1' ? 'No Priority - Click to set' : 
            selectedPriority === '3' ? 'Medium Priority - Click to change' : 
            selectedPriority === '4' ? 'High Priority - Click to change' :
            selectedPriority === '5' ? 'Completed - Click to change' : 
            'Click to set priority'}`}
    className={`priority-flag-button priority-${selectedPriority} ${selectedPriority > 1 ? 'has-priority' : ''} ${!isEditable || !canEditNote ? 'disabled' : ''}`}
    disabled={!isEditable || !canEditNote}
  >
    <i className="fas fa-flag"></i> {/* Always use flag icon */}
    
    {selectedPriority > 1 && (
      <div
        className={`priority-flag-dot priority-${selectedPriority}`}
      />
    )}
  </button>
</div>
        
        <button 
          onClick={clearEditor} 
          title="Clear All" 
          className="clear-button disabled"
          disabled={true}
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
      
      {(pastedImages.length > 0 || existingImages.length > 0) && (
        <div className="image-counter">
          <i className="fas fa-images"></i> 
          {existingImages.length} attached image{existingImages.length !== 1 ? 's' : ''}
          {pastedImages.length > 0 && `, ${pastedImages.length} new image${pastedImages.length !== 1 ? 's' : ''} (will be saved separately)`}
        </div>
      )}
    </div>
  );

  // Fullscreen image viewer component
  const renderFullscreenImage = () => {
    if (!showFullscreenImage || fullscreenImages.length === 0) return null;

    const currentImage = fullscreenImages[fullscreenImageIndex];

    return (
      <div className="fullscreen-overlay" onClick={() => setShowFullscreenImage(false)}>
        <div className="fullscreen-container" onClick={(e) => e.stopPropagation()}>
          <div className="fullscreen-header">
            <h3>
              {currentImage.name} ({fullscreenImageIndex + 1} of {fullscreenImages.length})
            </h3>
            <button 
              className="close-fullscreen-btn" 
              onClick={() => setShowFullscreenImage(false)}
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="fullscreen-image-container">
            <button 
              className="nav-btn prev-btn" 
              onClick={handlePrevImage}
              title="Previous image"
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            <div className="image-wrapper-fullscreen">
              <img 
                src={currentImage.url} 
                alt={currentImage.name}
                className="fullscreen-image"
              />
            </div>

            <button 
              className="nav-btn next-btn" 
              onClick={handleNextImage}
              title="Next image"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="fullscreen-footer">
            <div className="image-details">
              <p>
                <strong>Image:</strong> {currentImage.name}
              </p>
              <p>
                <strong>Position:</strong> {fullscreenImageIndex + 1} of {fullscreenImages.length}
              </p>
            </div>
            <div className="navigation-hint">
              <span>
                <i className="fas fa-arrow-left"></i> Previous image
              </span>
              <span>
                <i className="fas fa-arrow-right"></i> Next image
              </span>
              <span>
                <i className="fas fa-times"></i> Click outside or press ESC to close
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Delete confirmation modal
  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="delete-confirm-header">
            <h3>
              <i className="fas fa-exclamation-triangle" style={{ color: '#f44336', marginRight: '10px' }}></i>
              Delete Image
            </h3>
            <button 
              className="close-button" 
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>

          <div className="delete-confirm-content">
            
            <p className="delete-confirm-message">
              Are you sure you want to delete the image <strong>"{imageToDelete?.name}"</strong>?
            </p>
            
          </div>

          <div className="delete-confirm-actions">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="delete-cancel-button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteImage}
              className="delete-confirm-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Image"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!note) return null;

  return (
    <div className="edit-note-modal-overlay">
      <div className="edit-note-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>
            Edit Note{" "}
            {(!isEditable || !canEditNote) && (
              <i
                className="fas fa-eye"
                title={!canEditNote ? "View only - Only creator can edit" : "Only priority can be edited"}
              ></i>
            )}
          </h2>

          <button className="close-button" onClick={onClose} disabled={isSubmitting || isDownloading || isUploading}>
            ×
          </button>
        </div>
        {error && (
          <div className="error-message" style={{ margin: '10px 20px', padding: '12px', borderRadius: '6px', background: '#ffebee' }}>
            {error}
            <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {!canEditNote && (
          <div className="edit-warning">
            Only the person who created this note can update it.
          </div>
        )}

        {!isEditable && canEditNote && (
          <div className="edit-warning">
            This note is older than 24 hours. Only the priority can be updated.
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "journal" ? "active" : ""}`}
            onClick={() => setActiveTab("journal")}
          >
            Journal
          </button>
          
        </div>

        <div className="tab-content">
          {activeTab === "journal" ? (
            <div className="journal-section">
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={journalData.date}
                  onChange={handleJournalChange}
                  required
                  disabled={!isEditable || !canEditNote || isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Project:</label>
                <input
                  type="text"
                  name="projectId"
                  value={note.project || "No project name available"}
                  disabled
                  className="read-only-field"
                />
                <input
                  type="hidden"
                  name="projectId"
                  value={journalData.projectId}
                />
              </div>

              <div className="form-group">
                <label>Job:</label>
                <input
                  type="text"
                  name="jobId"
                  value={note.job || "No job name available"}
                  disabled
                  className="read-only-field"
                />
                <input
                  type="hidden"
                  name="jobId"
                  value={journalData.jobId}
                />
              </div>

              <div 
                ref={editorContainerRef} 
                className="form-group" 
                style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}
              >
                <label>Notes:</label>
                {renderEditorToolbar()}
                
                <div 
                  ref={editorRef}
                  contentEditable={isEditable && canEditNote}
                  className="rich-text-editor"
                  onPaste={handlePaste}
                  onInput={handleEditorInput}
                  onBlur={handleEditorInput}
                  placeholder={hasSetContent.current ? "Edit your note here... You can add new images and they will be saved separately." : "Loading content..."}
                  suppressContentEditableWarning={true}
                  style={{
                    pointerEvents: (isEditable && canEditNote && hasSetContent.current) ? 'auto' : 'none',
                    opacity: (isEditable && canEditNote && hasSetContent.current) ? 1 : 0.7,
                    flex: 1,
                    minHeight: '300px',
                    maxHeight: 'none',
                    height: 'calc(100vh - 450px)',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '15px',
                    backgroundColor: (isEditable && canEditNote && hasSetContent.current) ? '#fff' : '#f5f5f5',
                    cursor: (isEditable && canEditNote && hasSetContent.current) ? 'text' : 'default',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                />
                {!hasSetContent.current && (
                  <div className="editor-loading" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading content...
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "documents" ? (
            <div className="documents-section">
              <h3>Attached Documents</h3>
              {error && <p className="error-message">{error}</p>}
              {isLoadingDocuments ? (
                <p>Loading documents...</p>
              ) : (
                <>
                  {canEditNote && isEditable && (
                    <div className="document-actions">
                      <button onClick={handleAddDocument} className="add-button" disabled={isSubmitting || isDownloading}>
                        Add Document
                      </button>
                    </div>
                  )}

                  {isDownloading && (
                    <div style={{
                      margin: '16px 0',
                      padding: '16px',
                      background: '#e8f5e8',
                      border: '1px solid #4caf50',
                      borderRadius: '8px',
                      color: '#2e7d32',
                      textAlign: 'center'
                    }}>
                      <div className="spinner"></div>
                      <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                        Downloading {currentDownloadingFileName}...
                      </p>
                    </div>
                  )}

                  <div className="documents-list">
                    {documents.length === 0 ? (
                      <p>No documents attached</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Document Name</th>
                            <th>File Name</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.id}>
                              <td>{doc.name}</td>
                              <td>{doc.fileName || "N/A"}</td>
                              <td className="document-actions-cell">
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="download-button"
                                  disabled={isSubmitting || isDownloading}
                                >
                                  Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="journal-section">
              {isLoadingPriority ? (
                <div className="loading-priority">
                  <div className="spinner"></div>
                  <p>Loading priority...</p>
                </div>
              ) : (
                <div className="form-group">
                  <label>Priority {priorityId ? "(Update Only)" : "(Default - No Priority)"}</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    disabled={isSubmitting || !priorityId}
                    className={`priority-select ${selectedPriority ? `priority-${selectedPriority}` : "priority-default"}`}
                  >
                    <option value="1" className="priority-option-1">No Priority (Default)</option>
                    <option value="3" className="priority-option-3">Medium</option>
                    <option value="4" className="priority-option-4">High</option>
                  </select>
                  {!priorityId && (
                    <div className="priority-note">
                      <i className="fas fa-info-circle"></i> This note has no priority set. It uses the default "No Priority" setting.
                    </div>
                  )}
                  {priorityId && (
                    <div className="priority-note">
                      <i className="fas fa-info-circle"></i> Priority exists. Changing will update the existing priority.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={() => onClose(note.id)}
            className="cancel-button"
            disabled={isSubmitting || isDownloading || isUploading}
          >
            {"Close"}
          </button>
          {(
            <button onClick={handleSaveNote} className="save-button" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          )}
        </div>

        {showDocumentModal && (
          <div className="document-modal-overlay">
            <div className="document-modal" style={{ maxWidth: "560px" }}>

              <div className="modal-header">
                <h3>Add Document</h3>
                <button className="close-button" onClick={() => setShowDocumentModal(false)} disabled={isUploading}>
                  ×
                </button>
              </div>

              {error && (
                <div className="error-message" style={{ background: "#ffebee", padding: "12px", borderRadius: "6px", margin: "10px 20px" }}>
                  {error}
                  <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", fontWeight: "bold" }}>×</button>
                </div>
              )}

              <div style={{ padding: "20px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Document Name:</label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Site Photos March 2025"
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                    disabled={isUploading}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>File:</label>
                  <input type="file" onChange={handleDocumentFileChange} disabled={isUploading} style={{ width: "100%" }} />

                  {newDocument.file && (
                    <div style={{
                      marginTop: "12px",
                      padding: "14px 16px",
                      background: "#e8f5e8",
                      border: "1px solid #4caf50",
                      borderRadius: "8px",
                      color: "#2e7d32",
                      fontWeight: "500"
                    }}>
                      Selected: <strong>{newDocument.file.name}</strong>
                      <span style={{ marginLeft: "10px", opacity: 0.8 }}>
                        ({(newDocument.file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div style={{
                    textAlign: "center",
                    margin: "20px 0",
                    color: "#4caf50",
                    fontWeight: "600",
                    fontSize: "16px"
                  }}>
                    <div className="spinner"></div>
                    Uploading...
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ padding: "16px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setShowDocumentModal(false)} disabled={isUploading} style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: "6px" }}>
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  disabled={isUploading || !newDocument.name.trim() || !newDocument.file}
                  style={{
                    padding: "10px 20px",
                    background: isUploading ? "#4caf50" : "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600"
                  }}
                >
                  {isUploading ? `Uploading...` : "Save Document"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Image Viewer */}
        {renderFullscreenImage()}

        {/* Delete Confirmation Modal */}
        {renderDeleteConfirmation()}
      </div>
    </div>
  );
};

export default EditNoteModal;