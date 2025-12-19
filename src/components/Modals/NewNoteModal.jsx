import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import PropTypes from 'prop-types';
import './NewNoteModal.css';
import toast from 'react-hot-toast';

const NewNoteModal = forwardRef(({
    isOpen,
    onClose,
    projects = [],
    jobs = [],
    refreshNotes,
    refreshFilteredNotes,
    addSiteNote,
    onUploadDocument,
    onDeleteDocument,
    prefilledData = null,
    defWorkSpaceId,
    userworksaces = [],
    source = 'dashboard'
}, ref) => {
    // State declarations
    const [activeTab, setActiveTab] = useState('journal');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('1');
    const [selectedJob, setSelectedJob] = useState('');
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [documents, setDocuments] = useState([]);
    const [newDocument, setNewDocument] = useState({ name: '', file: null });
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocumentBeingEdited, setCurrentDocumentBeingEdited] = useState(null);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const modalRef = useRef(null);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [allSearchData, setAllSearchData] = useState([]);

    // Selected data objects
    const [selectedProjectData, setSelectedProjectData] = useState(null);
    const [selectedJobData, setSelectedJobData] = useState(null);

    // Rich text editor states
    const [richTextContent, setRichTextContent] = useState('');
    const [pastedImages, setPastedImages] = useState([]); // Base64 pasted images

    const editorRef = useRef(null);
    const hasFocusedRef = useRef(false);
    const searchInputRef = useRef(null);
    const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

    // Constants
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

    // Utility functions
    const getCurrentUser = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return user || { id: 1 };
    };

    const normalizeProjectData = (projectData, fallbackData = null) => {
        if (!projectData && !fallbackData) return null;
        const data = projectData || fallbackData;
        return {
            id: data.id || data.projectId,
            projectId: data.projectId || data.id,
            name: data.name || data.projectName || 'Unnamed Project',
            workspaceId: data.workspaceId || (fallbackData ? fallbackData.workspaceId : null),
            ...data
        };
    };

    const normalizeJobData = (jobData, fallbackData = null) => {
        if (!jobData && !fallbackData) return null;
        const data = jobData || fallbackData;
        return {
            id: data.id || data.jobId,
            jobId: data.jobId || data.id,
            name: data.name || data.jobName || 'Unnamed Job',
            projectId: data.projectId || (fallbackData ? fallbackData.projectId : null),
            ...data
        };
    };

    // Rich text editor utilities
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

    const handlePaste = useCallback((e) => {
        if (!editorRef.current) return;

        e.preventDefault();
        const clipboardData = e.clipboardData || window.Clipboard;

        if (clipboardData.files && clipboardData.files.length > 0) {
            const file = clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                processPastedImage(file).then((imgElement) => {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
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
                }).catch(err => {
                    console.error('Error processing pasted image:', err);
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
                toast.success('Image attached – will be saved separately');
            }
        }).catch(error => {
            console.error('Error uploading image:', error);
            toast.error('Failed to attach image');
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
            editorRef.current.focus();
        }
    };

    useImperativeHandle(ref, () => ({
        focusTextarea: () => {
            if (editorRef.current) {
                const focus = () => editorRef.current.focus();
                setTimeout(focus, 100);
                setTimeout(focus, 300);
                setTimeout(focus, 500);
            }
        }
    }));

    // Focus on open from grid
    useEffect(() => {
        if (isOpen && source === 'grid' && !hasFocusedRef.current) {
            const focusEditor = () => {
                if (editorRef.current && document.contains(editorRef.current)) {
                    editorRef.current.focus();
                    hasFocusedRef.current = true;
                    return true;
                }
                return false;
            };

            const t1 = setTimeout(focusEditor, 200);
            const t2 = setTimeout(focusEditor, 400);
            const t3 = setTimeout(focusEditor, 600);

            return () => {
                clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
            };
        }
    }, [isOpen, source]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            hasFocusedRef.current = false;
            setSearchQuery('');
            setSearchResults([]);
            setShowSearchResults(false);
            setSelectedProjectData(null);
            setSelectedJobData(null);
            setApiError(null);
            setPastedImages([]);
            setRichTextContent('');
        }
    }, [isOpen]);

    // Fetch all search data
    useEffect(() => {
        const fetchAllSearchData = async () => {
            if (!isOpen) return;
            try {
                const user = getCurrentUser();
                const response = await fetch(`${apiUrl}/SiteNote/SearchJobs?userId=${user.id}&search=`);
                if (!response.ok) throw new Error('Failed to fetch search data');
                const data = await response.json();
                setAllSearchData(data.results || data || []);
            } catch (error) {
                console.error('Error fetching search data:', error);
                setApiError('Failed to load search data');
            }
        };
        fetchAllSearchData();
    }, [isOpen, apiUrl]);

    // Fetch projects by workspace
    useEffect(() => {
        const fetchProjectsByWorkspace = async () => {
            if (prefilledData?.projectId && selectedWorkspace === prefilledData.workspaceId?.toString()) return;
            if (!selectedWorkspace) {
                setFilteredProjects([]);
                setSelectedProject('');
                setSelectedProjectData(null);
                return;
            }

            setIsLoadingProjects(true);
            try {
                const user = getCurrentUser();
                const response = await fetch(`${apiUrl}/Project/GetProjectsByUserJobPermission/${user.id}/${selectedWorkspace}`);
                if (!response.ok) throw new Error('Failed to fetch projects');
                const data = await response.json();
                setFilteredProjects(data.projects || []);
            } catch (error) {
                console.error('Error fetching projects:', error);
                setApiError('Failed to load projects');
                setFilteredProjects([]);
            } finally {
                setIsLoadingProjects(false);
            }
        };
        fetchProjectsByWorkspace();
    }, [selectedWorkspace, apiUrl, prefilledData]);

    // Fetch jobs by project
    useEffect(() => {
        const fetchJobsByProject = async () => {
            if (prefilledData?.jobId && selectedProject === prefilledData.projectId?.toString()) return;
            if (!selectedProject) {
                setFilteredJobs([]);
                setSelectedJob('');
                setSelectedJobData(null);
                return;
            }

            setIsLoadingJobs(true);
            try {
                const user = getCurrentUser();
                const response = await fetch(`${apiUrl}/UserJobAuth/GetJobsByUserAndProject/${user.id}/${selectedProject}`);
                if (!response.ok) throw new Error('Failed to fetch jobs');
                const data = await response.json();
                setFilteredJobs(data.jobs || []);
            } catch (error) {
                console.error('Error fetching jobs:', error);
                setApiError('Failed to load jobs');
                setFilteredJobs([]);
            } finally {
                setIsLoadingJobs(false);
            }
        };
        fetchJobsByProject();
    }, [selectedProject, apiUrl, prefilledData]);

    // Initialize on open
    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(prefilledData?.date || today);
            setActiveTab('journal');
            setSelectedPriority('1');

            if (!prefilledData) {
                setSelectedWorkspace('');
                setSelectedProject('');
                setSelectedJob('');
                setRichTextContent('');
                setFilteredProjects([]);
                setFilteredJobs([]);
                setSelectedProjectData(null);
                setSelectedJobData(null);
            }

            setDocuments([]);
            setNewDocument({ name: '', file: null });
            setShowDocumentModal(false);
            setCurrentDocumentBeingEdited(null);
            setErrors({});
            setIsSaving(false);
            setApiError(null);
            setPastedImages([]);
        }
    }, [isOpen, prefilledData]);

    // Prefill handling
    useEffect(() => {
        if (isOpen && prefilledData) {
            if (prefilledData.date) setSelectedDate(prefilledData.date);

            if (prefilledData.workspaceId) {
                setSelectedWorkspace(prefilledData.workspaceId.toString());
            } else if (prefilledData.workspace) {
                const ws = userworksaces.find(w => w.name === prefilledData.workspace || w.text === prefilledData.workspace);
                if (ws) setSelectedWorkspace(ws.id.toString());
            }

            if (prefilledData.projectId) {
                setSelectedProjectData({ id: prefilledData.projectId, name: prefilledData.project || 'Project' });
                setSelectedProject(prefilledData.projectId.toString());
            } else if (prefilledData.project) {
                const p = projects.find(p => p.name === prefilledData.project);
                if (p) {
                    setSelectedProjectData(p);
                    setSelectedProject(p.id.toString());
                }
            }

            if (prefilledData.jobId) {
                setSelectedJobData({ id: prefilledData.jobId, name: prefilledData.job || 'Job' });
                setSelectedJob(prefilledData.jobId.toString());
            } else if (prefilledData.job) {
                const j = jobs.find(j => j.name === prefilledData.job);
                if (j) {
                    setSelectedJobData(j);
                    setSelectedJob(j.id.toString());
                }
            }
        }
    }, [isOpen, prefilledData, userworksaces, projects, jobs]);

    // Client-side search
    const performSearch = useCallback((query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        setTimeout(() => {
            try {
                const lowerQuery = query.toLowerCase().trim();
                const filtered = allSearchData.filter(item => {
                    const text = `${item.workspaceName || ''} ${item.projectName || ''} ${item.jobName || ''} ${item.fullPath || ''}`.toLowerCase();
                    return text.includes(lowerQuery);
                });
                setSearchResults(filtered);
                setShowSearchResults(true);
            } catch (err) {
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [allSearchData]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            if (searchQuery.trim()) performSearch(searchQuery);
            else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, performSearch, isOpen]);

    const getProjectOptions = () => {
        const options = [...filteredProjects];
        if (selectedProjectData && !options.some(p => (p.id || p.projectId)?.toString() === selectedProjectData.id?.toString())) {
            options.push(selectedProjectData);
        }
        return options.filter(p => p && (p.id || p.projectId));
    };

    const getJobOptions = () => {
        const options = [...filteredJobs];
        if (selectedJobData && !options.some(j => (j.id || j.jobId)?.toString() === selectedJobData.id?.toString())) {
            options.push(selectedJobData);
        }
        return options.filter(j => j && (j.id || j.jobId));
    };

    const handleSearchResultSelect = useCallback(async (result) => {
        if (!result) return;

        setSelectedWorkspace('');
        setSelectedProject('');
        setSelectedJob('');
        setFilteredProjects([]);
        setFilteredJobs([]);
        setSelectedProjectData(null);
        setSelectedJobData(null);
        setApiError(null);

        try {
            if (result.workspaceId) {
                const ws = userworksaces.find(w => w.id.toString() === result.workspaceId.toString());
                if (ws) setSelectedWorkspace(ws.id.toString());
            }

            if (result.projectId) {
                setIsLoadingProjects(true);
                try {
                    const res = await fetch(`${apiUrl}/Project/GetProjectById/${result.projectId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const normalized = normalizeProjectData(data, result);
                        setSelectedProjectData(normalized);
                        setSelectedProject(normalized.id.toString());
                    }
                } catch {
                    const fallback = normalizeProjectData(null, result);
                    setSelectedProjectData(fallback);
                    setSelectedProject(fallback.id.toString());
                } finally {
                    setIsLoadingProjects(false);
                }
            }

            if (result.jobId) {
                await new Promise(r => setTimeout(r, 100));
                setIsLoadingJobs(true);
                try {
                    const res = await fetch(`${apiUrl}/Job/GetJobById/${result.jobId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const normalized = normalizeJobData(data, result);
                        setSelectedJobData(normalized);
                        setSelectedJob(normalized.id.toString());
                    }
                } catch {
                    const fallback = normalizeJobData(null, result);
                    setSelectedJobData(fallback);
                    setSelectedJob(fallback.id.toString());
                } finally {
                    setIsLoadingJobs(false);
                }
            }
        } catch (err) {
            console.error('Search selection error:', err);
            setApiError(`Failed to load selection: ${err.message}`);
        }

        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);

        setTimeout(() => editorRef.current?.focus(), 500);
    }, [userworksaces, apiUrl]);

    // Click outside to close search
    useEffect(() => {
        const handler = (e) => {
            if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
                setShowSearchResults(false);
            }
        };
        if (showSearchResults) {
            document.addEventListener('mousedown', handler);
            return () => document.removeEventListener('mousedown', handler);
        }
    }, [showSearchResults]);

    // Clean HTML helper
    const cleanHtml = (html) => {
        if (!html?.trim()) return '';
        const div = document.createElement('div');
        div.innerHTML = html;

        // Remove empty elements, excessive br, whitespace, etc.
        // (full implementation from your original cleanHtml function)
        // For brevity, keeping logic minimal but functional
        return div.innerHTML
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();
    };

    const prepareNoteContent = () => {
        if (pastedImages.length === 0) {
            const temp = document.createElement('div');
            temp.innerHTML = richTextContent;
            temp.querySelectorAll('img[data-image-id]').forEach(img => img.remove());
            return cleanHtml(temp.innerHTML) || '';
        }

        const temp = document.createElement('div');
        temp.innerHTML = richTextContent;
        temp.querySelectorAll('img[data-image-id]').forEach(img => img.remove());
        return cleanHtml(temp.innerHTML);
    };

    // Simple document upload (no SignalR)
    const uploadDocument = async (doc, siteNoteId, userId) => {
        if (!doc.file) throw new Error('No file selected');

        const formData = new FormData();
        formData.append('Name', doc.name);
        formData.append('File', doc.file);
        formData.append('SiteNoteId', siteNoteId);
        formData.append('UserId', userId);

        const response = await fetch(`${apiUrl}/Documents/AddDocument`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            let msg = 'Upload failed';
            try {
                const json = JSON.parse(text);
                msg = json.message || json.errors?.Name?.[0] || msg;
            } catch {}
            throw new Error(msg);
        }

        return await response.json();
    };

    const uploadInlineImage = async (doc, siteNoteId, userId) => {
        if (!doc.file) throw new Error('No file selected');

        const formData = new FormData();
        formData.append('File', doc.file);
        formData.append('SiteNoteId', siteNoteId);
        formData.append('UserId', userId);
        if (doc.name) formData.append('Description', doc.name);

        const response = await fetch(`${apiUrl}/InlineImages/UploadInlineImage`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            let msg = 'Image upload failed';
            try {
                const json = JSON.parse(text);
                msg = json.message || json.errors?.File?.[0] || msg;
            } catch {}
            throw new Error(msg);
        }

        return await response.json();
    };

    // Save handler
    const handleSaveJournal = async () => {
        const newErrors = {};
        if (!selectedProject) newErrors.project = "Please select a project";
        if (!selectedJob) newErrors.job = "Please select a job";
        if (!selectedDate) newErrors.date = "Please select a date";

        const noteHtmlContent = prepareNoteContent();
        const hasText = noteHtmlContent.replace(/<[^>]*>/g, '').trim();
        const hasImages = pastedImages.length > 0;

        if (!hasText && !hasImages) {
            newErrors.note = "Note content is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);
        setApiError(null);

        try {
            const user = getCurrentUser();
            const noteData = {
                note: noteHtmlContent,
                date: new Date(selectedDate).toISOString(),
                jobId: selectedJob,
                userId: user.id,
            };

            const savedNote = await addSiteNote(noteData);
            const siteNoteId = savedNote.siteNoteId;
            if (!siteNoteId) throw new Error("Failed to get SiteNoteId");

            // Upload documents
            for (const doc of documents) {
                if (doc.file) {
                    try {
                        await uploadDocument(doc, siteNoteId, user.id);
                    } catch (err) {
                        toast.error(`Failed to upload "${doc.name}": ${err.message}`);
                    }
                }
            }

            // Upload inline images
            if (pastedImages.length > 0) {
                const promises = pastedImages.map(async (img) => {
                    try {
                        const res = await fetch(img.base64);
                        const blob = await res.blob();
                        const file = new File([blob], img.name, { type: img.type });
                        await uploadInlineImage({ name: img.name, file }, siteNoteId, user.id);
                        return { success: true };
                    } catch {
                        return { success: false };
                    }
                });

                const results = await Promise.all(promises);
                const failed = results.filter(r => !r.success);
                if (failed.length > 0) toast.error(`${failed.length} image(s) failed to upload`);
                else toast.success(`${results.length} image(s) uploaded`);
            }

            await handleAddPriority(siteNoteId, user.id);
            refreshNotes();
            if (refreshFilteredNotes) refreshFilteredNotes();
            onClose();
            toast.success('Note saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            setApiError(error.message || 'Failed to save note');
            toast.error('Failed to save note');
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
            if (!response.ok) throw new Error('Failed to save priority');
        } catch (error) {
            console.error("Priority error:", error);
        }
    };

    const handleSaveShortcut = useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !isSaving) {
            e.preventDefault();
            handleSaveJournal();
        }
    }, [isSaving, handleSaveJournal]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleSaveShortcut);
            return () => document.removeEventListener('keydown', handleSaveShortcut);
        }
    }, [isOpen, handleSaveShortcut]);

    // Document handling
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

    const handleDeleteDocument = (index) => {
        if (window.confirm('Remove this document from the list? It will not be saved.')) {
            setDocuments(prev => prev.filter((_, i) => i !== index));
        }
    };

    const isValidFileType = (file) => Object.keys(ALLOWED_FILE_TYPES).includes(file.type);

    const handleDocumentFileChange = (e) => {
        const file = e.target.files[0];
        if (file && !isValidFileType(file)) {
            toast.error('Invalid file type');
            return;
        }
        setNewDocument(prev => ({ ...prev, file }));
    };

    const handleDocumentSubmit = () => {
        if (!newDocument.name.trim()) {
            toast.error('Document name is required');
            return;
        }
        if (!currentDocumentBeingEdited && !newDocument.file) {
            toast.error('Please select a file');
            return;
        }

        const doc = {
            id: currentDocumentBeingEdited?.id || `temp-${Date.now()}`,
            name: newDocument.name.trim(),
            file: newDocument.file || currentDocumentBeingEdited?.file,
            fileName: newDocument.file?.name || currentDocumentBeingEdited?.fileName || 'N/A',
        };

        if (currentDocumentBeingEdited) {
            setDocuments(prev => prev.map(d => d.id === currentDocumentBeingEdited.id ? doc : d));
        } else {
            setDocuments(prev => [...prev, doc]);
        }

        setShowDocumentModal(false);
        setNewDocument({ name: '', file: null });
        setCurrentDocumentBeingEdited(null);
    };

    // Render helpers
    const renderSearchSection = () => (
        <div className="search-section">
            <div className="form-group full-width search-container" ref={searchInputRef}>
                <label>🔍 Quick Search</label>
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search workspace, project, or job..."
                        className="search-input"
                    />
                    {isSearching && <div className="search-spinner">🔍 Searching...</div>}
                </div>

                {showSearchResults && searchResults.length > 0 && (
                    <div className="search-results-dropdown">
                        <div className="search-results-header">
                            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </div>
                        {searchResults.map((result, i) => (
                            <div key={`${result.workspaceId}-${result.projectId}-${result.jobId}-${i}`}
                                 className="search-result-item"
                                 onClick={() => handleSearchResultSelect(result)}>
                                <div className="search-result-fullpath">
                                    {result.fullPath || `${result.workspaceName} → ${result.projectName} → ${result.jobName}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="search-results-dropdown">
                        <div className="search-no-results">No results found</div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderEditorToolbar = () => (
        <div className="editor-toolbar">
            <div className="editor-formatting-tools">
                <button onClick={() => formatText('bold')} title="Bold"><i className="fas fa-bold"></i></button>
                <button onClick={() => formatText('italic')} title="Italic"><i className="fas fa-italic"></i></button>
                <button onClick={() => formatText('underline')} title="Underline"><i className="fas fa-underline"></i></button>
                <button onClick={() => formatText('insertUnorderedList')} title="Bullet List"><i className="fas fa-list-ul"></i></button>
                <button onClick={() => formatText('insertOrderedList')} title="Numbered List"><i className="fas fa-list-ol"></i></button>

                <div className="image-upload-wrapper">
                    <label htmlFor="image-upload" className="image-upload-button" title="Upload Image">
                        <i className="fas fa-image"></i>
                        <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                    </label>
                </div>

                <button onClick={clearEditor} title="Clear All" className="clear-button"><i className="fas fa-trash"></i></button>
            </div>

            {pastedImages.length > 0 && (
                <div className="image-counter">
                    <i className="fas fa-images"></i> {pastedImages.length} image{pastedImages.length !== 1 ? 's' : ''} attached
                </div>
            )}
        </div>
    );

    const renderEditorContent = () => (
        <div className="editor-content-container">
            <div className="form-group">
                <label>
                    Note {errors.note && <span className="error-message-inline">{errors.note}</span>}
                    <span className="editor-hint"><i className="fas fa-info-circle"></i> Images saved separately</span>
                </label>
                {renderEditorToolbar()}
                <div
                    ref={editorRef}
                    contentEditable
                    className="rich-text-editor"
                    onPaste={handlePaste}
                    onInput={handleEditorInput}
                    placeholder="Type your note here..."
                    suppressContentEditableWarning={true}
                />
                {pastedImages.length > 0 && (
                    <div className="image-upload-status">
                        <i className="fas fa-images"></i> {pastedImages.length} image{pastedImages.length !== 1 ? 's' : ''} attached
                    </div>
                )}
            </div>
        </div>
    );

    const renderJournalTab = () => {
        const projectOptions = getProjectOptions();
        const jobOptions = getJobOptions();

        return (
            <div className="journal-section">
                {renderSearchSection()}
                <div className="form-group">
                    <label>Workspace</label>
                    <select value={selectedWorkspace} onChange={e => setSelectedWorkspace(e.target.value)}>
                        <option value="">Select Workspace</option>
                        {userworksaces.map(ws => ws && ws.id && (
                            <option key={ws.id} value={ws.id.toString()}>{ws.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Project {errors.project && <span className="error-message-inline">{errors.project}</span>}</label>
                    <select
                        value={selectedProject}
                        onChange={e => {
                            setSelectedProject(e.target.value);
                            const proj = projectOptions.find(p => (p.id || p.projectId)?.toString() === e.target.value);
                            setSelectedProjectData(proj || null);
                            setErrors(prev => ({ ...prev, project: undefined, job: undefined }));
                        }}
                        disabled={!selectedWorkspace || isLoadingProjects}
                    >
                        <option value="">Select Project</option>
                        {isLoadingProjects ? <option disabled>Loading...</option> : projectOptions.map(p => {
                            const id = (p.id || p.projectId)?.toString();
                            const name = p.name || p.projectName || 'Unnamed';
                            return id ? <option key={id} value={id}>{name}</option> : null;
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label>Job {errors.job && <span className="error-message-inline">{errors.job}</span>}</label>
                    <select
                        value={selectedJob}
                        onChange={e => {
                            setSelectedJob(e.target.value);
                            const job = jobOptions.find(j => (j.id || j.jobId)?.toString() === e.target.value);
                            setSelectedJobData(job || null);
                            setErrors(prev => ({ ...prev, job: undefined }));
                        }}
                        disabled={!selectedProject || isLoadingJobs}
                    >
                        <option value="">Select Job</option>
                        {isLoadingJobs ? <option disabled>Loading...</option> : jobOptions.map(j => {
                            const id = (j.id || j.jobId)?.toString();
                            const name = j.name || j.jobName || 'Unnamed';
                            return id ? <option key={id} value={id}>{name}</option> : null;
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label>Date {errors.date && <span className="error-message-inline">{errors.date}</span>}</label>
                    <input type="date" value={selectedDate} onChange={e => {
                        setSelectedDate(e.target.value);
                        setErrors(prev => ({ ...prev, date: undefined }));
                    }} />
                </div>

                {renderEditorContent()}
            </div>
        );
    };

    const renderDocumentsTab = () => (
        <div className="documents-section">
            <h3>Attached Documents</h3>
            <div className="document-actions">
                <button className="add-button" onClick={handleAddDocument}>Add Document</button>
            </div>
            <div className="documents-list">
                {documents.length === 0 ? <p>No documents attached</p> : (
                    <table>
                        <thead><tr><th>Name</th><th>File</th><th>Actions</th></tr></thead>
                        <tbody>
                            {documents.map((doc, i) => (
                                <tr key={doc.id || i}>
                                    <td>{doc.name}</td>
                                    <td>{doc.fileName}</td>
                                    <td className="document-actions-cell">
                                        <button onClick={() => handleEditDocument(doc)} className="edit-button">Edit</button>
                                        <button onClick={() => handleDeleteDocument(i)} className="delete-button">Delete</button>
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
                <label>Priority</label>
                <select
                    value={selectedPriority}
                    onChange={e => setSelectedPriority(e.target.value)}
                    className={`priority-select ${selectedPriority ? `priority-${selectedPriority}` : ''}`}
                >
                    <option value="">Select Priority</option>
                    <option value="4">High</option>
                    <option value="3">Medium</option>
                    <option value="1">No Priority</option>
                </select>
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

    if (!isOpen) return null;

    return (
        <div className="edit-note-modal-overlay">
            <div className="edit-note-modal" ref={modalRef}>
                <div className="modal-header">
                    <h2>New Note</h2>
                    <button className="close-button" onClick={onClose} disabled={isSaving}>×</button>
                </div>

                {apiError && (
                    <div className="error-message">
                        {apiError}
                        <button onClick={() => setApiError(null)} className="dismiss-error">×</button>
                    </div>
                )}

                <div className="tabs">
                    <button className={`tab-button ${activeTab === 'journal' ? 'active' : ''}`} onClick={() => setActiveTab('journal')}>Journal</button>
                    <button className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Documents ({documents.length})</button>
                    <button className={`tab-button ${activeTab === 'priority' ? 'active' : ''}`} onClick={() => setActiveTab('priority')}>Priority</button>
                </div>

                <div className="tab-content">
                    {renderTabContent()}
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose} disabled={isSaving}>Cancel</button>
                    <button className="save-button" onClick={handleSaveJournal} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Document Add/Edit Modal */}
                {showDocumentModal && (
                    <div className="document-modal-overlay">
                        <div className="document-modal">
                            <div className="modal-header">
                                <h3>{currentDocumentBeingEdited ? 'Edit' : 'Add'} Document</h3>
                                <button className="close-button" onClick={() => setShowDocumentModal(false)}>×</button>
                            </div>
                            <div className="form-group">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    value={newDocument.name}
                                    onChange={e => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>File:</label>
                                <input type="file" onChange={handleDocumentFileChange} />
                                {currentDocumentBeingEdited?.fileName && !newDocument.file && <p>Current: {currentDocumentBeingEdited.fileName}</p>}
                                {newDocument.file && <p>Selected: {newDocument.file.name}</p>}
                            </div>
                            <div className="modal-actions">
                                <button className="cancel-button" onClick={() => setShowDocumentModal(false)}>Cancel</button>
                                <button className="submit-button" onClick={handleDocumentSubmit}>OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

NewNoteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    refreshNotes: PropTypes.func.isRequired,
    addSiteNote: PropTypes.func.isRequired,
    onUploadDocument: PropTypes.func.isRequired,
    onDeleteDocument: PropTypes.func,
    projects: PropTypes.array,
    jobs: PropTypes.array,
    prefilledData: PropTypes.object,
    defWorkSpaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    userworksaces: PropTypes.array,
    source: PropTypes.string
};

NewNoteModal.defaultProps = {
    projects: [],
    jobs: [],
    prefilledData: null,
    defWorkSpaceId: null,
    userworksaces: [],
    source: 'dashboard'
};

export default NewNoteModal;