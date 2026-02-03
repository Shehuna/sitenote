import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ReplyModal.css';
import toast from 'react-hot-toast';
import 'emoji-picker-element';

const ReplyModal = ({
  note,
  onClose,
  refreshNotes,
}) => {
  const [activeTab, setActiveTab] = useState('journal');
  const [selectedPriority, setSelectedPriority] = useState('1');
  const [documents, setDocuments] = useState([]);
  const [newDocument, setNewDocument] = useState({ name: '', file: null });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [currentDocumentBeingEdited, setCurrentDocumentBeingEdited] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  const [richTextContent, setRichTextContent] = useState('');
  const [pastedImages, setPastedImages] = useState([]);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Emoji picker states - ADDED
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const popupRef = useRef(null);

  const ALLOWED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/gif': ['.gif'],
    'image/webp': ['.webp'], 'image/svg+xml': ['.svg'], 'application/pdf': ['.pdf'],
    'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'], 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'], 'audio/aac': ['.aac'], 'video/mp4': ['.mp4'],
    'video/mpeg': ['.mpeg'], 'video/ogg': ['.ogv'], 'video/webm': ['.webm'],
    'video/quicktime': ['.mov'], 'video/x-msvideo': ['.avi']
  };

  // Initialize emoji picker - ADDED
  useEffect(() => {
    if (emojiPickerRef.current) {
      let handleClickOutside;
      
      if (emojiPickerRef.current) {
        const handleEmojiClick = (event) => {
          console.log('Emoji click event received:', event);
          console.log('Event type:', event.type);
          console.log('Event detail:', event.detail);
          console.log('Event target:', event.target);
          
          if (!editorRef.current) return;
          
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
  }, [showEmojiPicker]);

  const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || { id: 1, name: 'Current User', userName: 'Current User' };
  };

  const handlePriorityClick = () => {
    let nextPriority;
    if (selectedPriority === '1') {
        nextPriority = '3'; 
    } else if (selectedPriority === '3') {
        nextPriority = '4'; 
    } else {
        nextPriority = '1'; 
    }
    
    setSelectedPriority(nextPriority);
    toast.success(`Priority set to ${nextPriority === '4' ? 'High' : nextPriority === '3' ? 'Medium' : 'No Priority'}`);
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const truncateHtml = (html, maxWords = 20) => { 
    if (!html) return '';
    
    const plainText = stripHtml(html);
    const words = plainText.split(/\s+/);
    
    if (words.length <= maxWords) return html;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const truncateNode = (node, remainingWords) => {
      if (remainingWords <= 0) return 0;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const wordsInNode = node.textContent.split(/\s+/);
        if (wordsInNode.length <= remainingWords) {
          return wordsInNode.length;
        } else {
          const truncatedText = wordsInNode.slice(0, remainingWords).join(' ') + '...';
          node.textContent = truncatedText;
          return remainingWords;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        let wordsUsed = 0;
        for (let child of node.childNodes) {
          if (wordsUsed >= remainingWords) {
            while (child) {
              const nextSibling = child.nextSibling;
              node.removeChild(child);
              child = nextSibling;
            }
            break;
          }
          wordsUsed += truncateNode(child, remainingWords - wordsUsed);
        }
        return wordsUsed;
      }
      return 0;
    };
    
    truncateNode(tempDiv, maxWords);
    
    return tempDiv.innerHTML;
  };

  const needsTruncation = (html) => {
    if (!html) return false;
    const plainText = stripHtml(html);
    return plainText.split(/\s+/).length > 20; 
  };

  const processPastedImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target.result;
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const imageName = file.name || `image-${Date.now()}.png`;
        
        const img = document.createElement('img');
        img.src = base64Image;
        img.alt = 'Pasted image';
        img.className = 'editor-image';
        img.dataset.imageId = imageId;
        img.dataset.imageName = imageName;
        img.dataset.imageBase64 = base64Image;
        
        setPastedImages(prev => [...prev, {
          id: imageId,
          name: imageName,
          base64: base64Image,
          type: file.type,
          size: file.size
        }]);
        
        resolve(img);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const safelyRenderHTML = (html) => {
    if (!html) return { __html: '' };
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select');
    dangerous.forEach(el => el.remove());
    
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
      
      ['href', 'src', 'action'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && value.toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr);
        }
      });
    });
    
    return { __html: doc.body.innerHTML };
  };

  const renderOriginalNoteContent = () => {
    if (!note?.note) return { __html: '' };
    
    if (!isContentExpanded) {
      const truncatedHtml = truncateHtml(note.note, 20); 
      return safelyRenderHTML(truncatedHtml);
    }
    
    return safelyRenderHTML(note.note);
  };

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.Clipboard;
    
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      
      if (file.type.startsWith('image/')) {
        processPastedImage(file).then((imgElement) => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            
            range.deleteContents();
            range.insertNode(imgElement);
            
            const space = document.createTextNode(' ');
            range.insertNode(space);
            
            range.setStartAfter(space);
            range.setEndAfter(space);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          setRichTextContent(editorRef.current.innerHTML);
        }).catch(error => {
          console.error('Error processing pasted image:', error);
          document.execCommand('insertText', false, '');
        });
        return;
      }
    }
    
    const pastedText = clipboardData.getData('text');
    if (pastedText) {
      document.execCommand('insertText', false, pastedText);
      setRichTextContent(editorRef.current.innerHTML);
    }
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    processPastedImage(file).then((imgElement) => {
      if (editorRef.current) {
        editorRef.current.appendChild(imgElement);
        editorRef.current.appendChild(document.createTextNode(' '));
        setRichTextContent(editorRef.current.innerHTML);
        editorRef.current.scrollTop = editorRef.current.scrollHeight;
        toast.success('Image uploaded successfully - will be saved separately');
      }
    }).catch(error => {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    });
    
    e.target.value = '';
  }, []);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }
  }, []);

  const clearEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setRichTextContent('');
    }
    setPastedImages([]);
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current.focus();
      }, 100);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const prepareNoteContent = () => {
    if (pastedImages.length === 0) {
      let cleanContent = richTextContent;
      if (cleanContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanContent;
        
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => img.remove());
        
        cleanContent = cleanHtml(tempDiv.innerHTML);
      }
      return cleanContent || '';
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = richTextContent;
    
    const images = tempDiv.querySelectorAll('img[data-image-id]');
    images.forEach(img => {
      img.remove();
    });
    
    let cleanContent = tempDiv.innerHTML;
    cleanContent = cleanHtml(cleanContent);
    
    return cleanContent;
  };

  const cleanHtml = (htmlContent) => {
    if (!htmlContent || htmlContent.trim() === '') {
      return '';
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const emptyElements = tempDiv.querySelectorAll('div:empty, p:empty, span:empty, br:only-child');
    emptyElements.forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('*')) {
        el.remove();
      }
    });
    
    const blockElements = tempDiv.querySelectorAll('div, p');
    blockElements.forEach(block => {
      let firstChild = block.firstChild;
      while (firstChild && 
            ((firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName === 'BR') ||
              (firstChild.nodeType === Node.TEXT_NODE && !firstChild.textContent.trim()))) {
        const nextSibling = firstChild.nextSibling;
        firstChild.remove();
        firstChild = nextSibling;
      }
    
      let lastChild = block.lastChild;
      while (lastChild && 
            ((lastChild.nodeType === Node.ELEMENT_NODE && lastChild.tagName === 'BR') ||
              (lastChild.nodeType === Node.TEXT_NODE && !lastChild.textContent.trim()))) {
        const previousSibling = lastChild.previousSibling;
        lastChild.remove();
        lastChild = previousSibling;
      }
    
      const brElements = block.querySelectorAll('br');
      brElements.forEach((br, index) => {
        if (br.nextSibling && br.nextSibling.nodeType === Node.ELEMENT_NODE && 
            br.nextSibling.tagName === 'BR') {
          br.remove();
        }
      });
    });
    
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const emptyTextNodes = [];
    let node = walker.nextNode();
    while (node) {
      emptyTextNodes.push(node);
      node = walker.nextNode();
    }
    
    emptyTextNodes.forEach(node => node.remove());
    
    let cleanedHtml = tempDiv.innerHTML;
    
    cleanedHtml = cleanedHtml
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+$/g, '')
      .replace(/^\s+/g, '')
      .trim();
    
    cleanedHtml = cleanedHtml
      .replace(/<div><\/div>/g, '')
      .replace(/<p><\/p>/g, '')
      .replace(/<span><\/span>/g, '')
      .replace(/<div>\s*<\/div>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<span>\s*<\/span>/g, '');
    
    return cleanedHtml;
  };

  const uploadDocument = async (doc, siteNoteId, userId) => {
    if (!doc.file) {
      throw new Error('No file selected for upload');
    }

    const formData = new FormData();
    formData.append('Name', doc.name); 
    formData.append('File', doc.file);      
    formData.append('SiteNoteId', siteNoteId);
    formData.append('UserId', userId);

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Documents/AddDocument`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Upload failed';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.errors?.Name?.[0] || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  };

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

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/InlineImages/UploadInlineImage`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Image upload failed';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.errors?.File?.[0] || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  };

  const handleSaveReply = async () => {
    const newErrors = {};
    
    const noteHtmlContent = prepareNoteContent();
    
    const hasTextContent = noteHtmlContent.replace(/<[^>]*>/g, '').trim();
    const hasImages = pastedImages.length > 0;
    
    if (!hasTextContent && !hasImages && documents.length === 0) {
      newErrors.note = "Reply content, images, or documents are required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setApiError(null);

    try {
      const user = getCurrentUser();
      const now = new Date();
      
      const replyData = {
        Note: noteHtmlContent,
        UserId: user.id,
        UserName: user.userName || user.username || user.name || 'Current User',
        Date: now.toISOString().split('T')[0],
        TimeStamp: now.toISOString(),
        Workspace: note.workspace || '',
        Project: note.project || '',
        Job: note.job || '',
        JobId: note.jobId || null,
        RepliedSiteNoteId: note.id,
        PriorityValue: selectedPriority || '1'
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/SiteNote/AddReplySiteNote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(replyData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to post reply');
        } catch {
          throw new Error(errorText || 'Request failed');
        }
      }

      const result = await response.json();
      const siteNoteId = result.siteNoteId || result.id;

      if (!siteNoteId) {
        throw new Error("Failed to retrieve SiteNoteId from the saved reply.");
      }

      for (const doc of documents) {
        if (doc.file) {
          try {
            await uploadDocument(doc, siteNoteId, user.id);
            console.log(`Document "${doc.name}" uploaded successfully`);
          } catch (err) {
            console.error(`Error uploading document "${doc.name}":`, err);
            toast.error(`Failed to upload document "${doc.name}": ${err.message}`);
          }
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
            
            console.log(`Uploading image "${image.name}" to inline images endpoint...`);
            const result = await uploadInlineImage(imageDoc, siteNoteId, user.id);
            console.log(`Image "${image.name}" uploaded successfully with ID:`, result.id);
            
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

      await handleAddPriority(siteNoteId, user.id);
      
      setRichTextContent('');
      setPastedImages([]);
      setDocuments([]);
      
      if (refreshNotes) {
        await refreshNotes();
      }
      
      onClose();
      toast.success('Reply sent successfully!');
    } catch (error) {
      console.error("Save error:", error);
      setApiError(error.message || "Failed to save reply");
      toast.error('Failed to save reply');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPriority = async (noteId, userId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteID: noteId,
          priorityValue: selectedPriority,
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save priority");
      }
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  const handleAddDocument = () => {
    setCurrentDocumentBeingEdited(null);
    setNewDocument({ name: '', file: null });
    setErrors({});
    setShowDocumentModal(true);
  };

  const handleEditDocument = (doc) => {
    setCurrentDocumentBeingEdited(doc);
    setNewDocument({ name: doc.name, file: null });
    setErrors({});
    setShowDocumentModal(true);
  };

  const handleDeleteDocument = (indexToDelete) => {
    if (window.confirm('Are you sure you want to remove this document from the list? It will not be saved.')) {
      setDocuments(prev => prev.filter((_, i) => i !== indexToDelete));
    }
  };

  const isValidFileType = (file) => {
    return Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    setError('');

    if (!isValidFileType(file)) {
      setError('Invalid file type!');
      return;
    }

    setNewDocument(prev => ({ ...prev, file }));
  };

  const handleDocumentSubmit = () => {
    const newDocErrors = {};
    if (!newDocument.name.trim()) {
      setError('Document name is required.');
      return;
    }
    if (!currentDocumentBeingEdited && !newDocument.file) {
      newDocErrors.newDocumentFile = "Please select a file to add.";
    }

    if (Object.keys(newDocErrors).length > 0) {
      setErrors(newDocErrors);
      return;
    }

    const docToStage = {
      id: currentDocumentBeingEdited?.id || `temp-${Date.now()}`,
      name: newDocument.name.trim(),
      file: newDocument.file || currentDocumentBeingEdited?.file,
      fileName: newDocument.file?.name || currentDocumentBeingEdited?.fileName || 'N/A',
    };

    if (currentDocumentBeingEdited) {
      setDocuments(prev => prev.map(doc => 
        doc.id === currentDocumentBeingEdited.id ? { ...doc, ...docToStage } : doc
      ));
    } else {
      setDocuments(prev => [...prev, docToStage]);
    }

    setShowDocumentModal(false);
    setNewDocument({ name: '', file: null });
    setCurrentDocumentBeingEdited(null);
    setErrors({});
  };

  // Editor toolbar component with emoji picker - UPDATED
  const renderEditorToolbar = () => (
    <div className="editor-toolbar">
      <div className="editor-formatting-tools">
        <button 
          onClick={() => formatText('bold')} 
          title="Bold"
          type="button"
        >
          <i className="fas fa-bold"></i>
        </button>
        <button 
          onClick={() => formatText('italic')} 
          title="Italic"
          type="button"
        >
          <i className="fas fa-italic"></i>
        </button>
        <button 
          onClick={() => formatText('underline')} 
          title="Underline"
          type="button"
        >
          <i className="fas fa-underline"></i>
        </button>
        <button 
          onClick={() => formatText('insertUnorderedList')} 
          title="Bullet List"
          type="button"
        >
          <i className="fas fa-list-ul"></i>
        </button>
        <button 
          onClick={() => formatText('insertOrderedList')} 
          title="Numbered List"
          type="button"
        >
          <i className="fas fa-list-ol"></i>
        </button>
        
        {/* Emoji Picker Button - ADDED */}
        <div className="emoji-picker-wrapper" style={{ position: 'relative' }}>
          <button 
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Insert Emoji"
            className={`emoji-button ${showEmojiPicker ? 'active' : ''}`}
            type="button"
          >
            <i className="far fa-smile"></i>
          </button>
          
          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
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
            className="image-upload-button" 
            title="Upload Image"
          >
            <i className="fas fa-image"></i>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <div className="documents-button-wrapper" style={{ position: 'relative' }}>
          <button 
            onClick={() => setActiveTab('documents')} 
            title={`${documents.length} document${documents.length !== 1 ? 's' : ''} attached`}
            className={`documents-button ${activeTab === 'documents' ? 'active' : ''}`}
            type="button"
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
                    'High Priority - Click to change'}`}
            className={`priority-flag-button priority-${selectedPriority} ${selectedPriority > 1 ? 'has-priority' : ''}`}
            type="button"
          >
            <i className="fas fa-flag"></i>
            
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
          className="clear-button"
          type="button"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
      
      {pastedImages.length > 0 && (
        <div className="image-counter">
          <i className="fas fa-images"></i> {pastedImages.length} image{pastedImages.length !== 1 ? 's' : ''} attached
        </div>
      )}
    </div>
  );

  const renderEditorContent = () => {
    return (
      <div className="editor-content-container">
        <div className="form-group">
          <label>
            Reply {errors.note && <span className="error-message-inline">{errors.note}</span>}
            <span className="editor-hint">
              <i className="fas fa-info-circle"></i> Format text with tools below. Images will be saved separately.
            </span>
          </label>
          
          {renderEditorToolbar()}
          
          <div 
            ref={editorRef}
            contentEditable={true}
            className="rich-text-editor"
            onPaste={handlePaste}
            onInput={handleEditorInput}
            placeholder="Type your reply here and paste images."
            suppressContentEditableWarning={true}
          />
          
          {pastedImages.length > 0 && (
            <div className="image-upload-status">
              <i className="fas fa-images"></i>
              {pastedImages.length} image{pastedImages.length !== 1 ? 's' : ''} attached (will be saved separately)
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderJournalTab = () => {
    return (
      <div className="journal-section">
        {renderEditorContent()}
      </div>
    );
  };

  const renderDocumentsTab = () => (
    <div className="documents-section">
      <h3>Attached Documents</h3>
      <div className="document-actions">
        <button className="add-button" onClick={handleAddDocument} type="button">
          Add Document
        </button>
      </div>

      <div className="documents-list">
        {documents.length === 0 ? (
          <div className="no-documents">No documents attached</div>
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
              {documents.map((doc, index) => (
                <tr key={doc.id || index}>
                  <td>{doc.name}</td>
                  <td>{doc.fileName || 'N/A'}</td>
                  <td className="document-actions-cell">
                    <button onClick={() => handleEditDocument(doc)} className="edit-button" type="button">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteDocument(index)} className="delete-button" type="button">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderPriorityTab = () => (
    <div className="journal-section">
      <div className="form-group">
        <label>Priority {errors.priority && <span className="error-message-inline">{errors.priority}</span>}</label>
        <div className="priority-tab-note">
          <i className="fas fa-info-circle"></i> Priority can be set using the flag button in the toolbar above.
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'journal': return renderJournalTab();
      case 'documents': return renderDocumentsTab();
      case 'priority': return renderPriorityTab();
      default: return renderJournalTab();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shouldShowExpandButton = note?.note && needsTruncation(note.note);

  if (!note) return null;

  return (
    <div 
      ref={popupRef}
      className="reply-modal-overlay new-note-modal"
    >
      <div 
        className="modal-content" 
        ref={modalRef}
      >
        <div className="modal-content-wrapper">
          <div className="original-note-preview compact">
            <div className="original-note-header">
              <div className="original-note-user-info">
                <div className="original-note-user">
                  <i className="fas fa-user-circle" />
                  <span>{note.userName || 'User'}</span>
                </div>
                <div className="original-note-date">
                  <i className="far fa-clock" />
                  <span>{formatDate(note.date || note.timeStamp)}</span>
                </div>
              </div>
              
              <div className="original-note-context">
                <span className="context-item">
                  <i className="fas fa-building" /> {note.workspace || '—'}
                </span>
                <span className="context-item">
                  <i className="fas fa-project-diagram" /> {note.project || '—'}
                </span>
                <span className="context-item">
                  <i className="fas fa-tasks" /> {note.job || '—'}
                </span>
              </div>
            </div>
            
            <div className="original-note-content">
              <div 
                className="original-note-text"
                dangerouslySetInnerHTML={renderOriginalNoteContent()}
              />
              
              {shouldShowExpandButton && (
                <div className="expand-content-container">
                  <button 
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="expand-content-button"
                    type="button"
                  >
                    {isContentExpanded ? (
                      <>
                        <i className="fas fa-chevron-up"></i>
                        Show Less
                      </>
                    ) : (
                      <>
                        <i className="fas fa-chevron-down"></i>
                        Show More
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {apiError && (
            <div className="error-message sticky-error">
              {apiError}
              <button onClick={() => setApiError(null)} className="dismiss-error">×</button>
            </div>
          )}

          <div className="tab-content-scrollable">
            {renderTabContent()}
          </div>

          <div className="modal-footer sticky-footer">
            <button className="cancel-button" onClick={onClose} disabled={isSaving} type="button">
              Cancel
            </button>
            <button className="save-button" onClick={handleSaveReply} disabled={isSaving} type="button">
              {isSaving ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {showDocumentModal && (
          <div className="document-modal-overlay">
            <div className="document-modal">
              <div className="modal-header">
                <h3>{currentDocumentBeingEdited ? 'Edit Document' : 'Add Document'}</h3>
                <button className="close-button" onClick={() => setShowDocumentModal(false)} type="button">
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Document Name:</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>File:</label>
                <input
                  type="file"
                  onChange={handleDocumentFileChange}
                  required={!currentDocumentBeingEdited}
                />
                {currentDocumentBeingEdited?.fileName && !newDocument.file && (
                  <p>Current file: {currentDocumentBeingEdited.fileName}</p>
                )}
                {newDocument.file && (
                  <p>Selected file: {newDocument.file.name}</p>
                )}
                {error && (
                  <p className="file-error">{error}</p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setCurrentDocumentBeingEdited(null);
                    setNewDocument({ name: '', file: null });
                    setErrors({});
                  }}
                  className="cancel-button"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentSubmit}
                  className="submit-button"
                  disabled={!newDocument.name.trim() || (!newDocument.file && !currentDocumentBeingEdited?.fileName)}
                  type="button"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplyModal;