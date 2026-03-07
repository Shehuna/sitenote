import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import "./NewTaskModal.css";
import toast from "react-hot-toast";
import "emoji-picker-element";

const NewTaskModal = ({
  isOpen,
  onClose,
  refreshNotes,
  refreshFilteredNotes,
  userworksaces = [],
  source = "dashboard",
  defaultWorkspaceRole,
  fetchNotesWithFilters,
  selectedFilters,
  hasActiveFilters,
  viewMode = "cards",
  refreshStackedView = null,
  hasActiveSearchText,
  performSearching,
  searchTerm
}) => {
  // State declarations
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  
  const modalRef = useRef(null);

  // New search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allSearchData, setAllSearchData] = useState([]);

  // Store the actual project and job objects for dropdown display
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [selectedJobData, setSelectedJobData] = useState(null);

  // Rich text editor states for description
  const [richTextContent, setRichTextContent] = useState("");
  const [pastedImages, setPastedImages] = useState([]);

  // Emoji picker states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const editorRef = useRef(null);
  const hasFocusedRef = useRef(false);
  const searchInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Check if user has read-only access (role 3)
  const isReadOnly = defaultWorkspaceRole === 3;

  // Color options for text color picker
  const colorOptions = [
    { name: "Black", value: "#000000" },
    { name: "Dark Gray", value: "#666666" },
    { name: "Gray", value: "#999999" },
    { name: "Light Gray", value: "#cccccc" },
    { name: "White", value: "#ffffff" },
    { name: "Red", value: "#ff0000" },
    { name: "Dark Red", value: "#8b0000" },
    { name: "Orange", value: "#ff9900" },
    { name: "Brown", value: "#8b4513" },
    { name: "Yellow", value: "#ffff00" },
    { name: "Green", value: "#008000" },
    { name: "Light Green", value: "#90ee90" },
    { name: "Blue", value: "#0000ff" },
    { name: "Light Blue", value: "#add8e6" },
    { name: "Dark Blue", value: "#00008b" },
    { name: "Purple", value: "#800080" },
    { name: "Pink", value: "#ffc0cb" },
    { name: "Hot Pink", value: "#ff69b4" },
    { name: "Cyan", value: "#00ffff" },
    { name: "Teal", value: "#008080" },
  ];

  // Initialize emoji picker
  useEffect(() => {
    if (isOpen && !isReadOnly) {
      let handleClickOutside;

      if (emojiPickerRef.current) {
        const handleEmojiClick = (event) => {
          if (!editorRef.current || isReadOnly) return;

          let emojiChar = "";

          if (event.detail) {
            if (typeof event.detail === "string") {
              emojiChar = event.detail;
            } else if (event.detail.unicode) {
              emojiChar = event.detail.unicode;
            } else if (event.detail.native) {
              emojiChar = event.detail.native;
            } else if (event.detail.emoji) {
              emojiChar = event.detail.emoji;
            }
          }

          if (!emojiChar) {
            emojiChar = "❓";
          }

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

        emojiPickerRef.current.addEventListener(
          "emoji-click",
          handleEmojiClick,
        );

        emojiPickerRef.current._handleEmojiClick = handleEmojiClick;

        handleClickOutside = (event) => {
          if (
            showEmojiPicker &&
            emojiButtonRef.current &&
            !emojiButtonRef.current.contains(event.target) &&
            emojiPickerRef.current &&
            !emojiPickerRef.current.contains(event.target)
          ) {
            setShowEmojiPicker(false);
          }
        };

        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        if (
          emojiPickerRef.current &&
          emojiPickerRef.current._handleEmojiClick
        ) {
          emojiPickerRef.current.removeEventListener(
            "emoji-click",
            emojiPickerRef.current._handleEmojiClick,
          );
          delete emojiPickerRef.current._handleEmojiClick;
        }

        if (handleClickOutside) {
          document.removeEventListener("mousedown", handleClickOutside);
        }
      };
    }
  }, [isOpen, showEmojiPicker, isReadOnly]);

  // Utility functions
  const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user || { id: 1 };
  };

  const normalizeProjectData = (projectData, fallbackData = null) => {
    if (!projectData && !fallbackData) return null;

    const data = projectData || fallbackData;
    return {
      id: data.id || data.projectId,
      projectId: data.projectId || data.id,
      name: data.name || data.projectName || "Unnamed Project",
      workspaceId:
        data.workspaceId || (fallbackData ? fallbackData.workspaceId : null),
      ...data,
    };
  };

  const normalizeJobData = (jobData, fallbackData = null) => {
    if (!jobData && !fallbackData) return null;

    const data = jobData || fallbackData;
    return {
      id: data.id || data.jobId,
      jobId: data.jobId || data.id,
      name: data.name || data.jobName || "Unnamed Job",
      projectId:
        data.projectId || (fallbackData ? fallbackData.projectId : null),
      ...data,
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

        const img = document.createElement("img");
        img.src = base64Image;
        img.alt = "Pasted image";
        img.className = "editor-image";
        img.dataset.imageId = imageId;
        img.dataset.imageName = imageName;
        img.dataset.imageBase64 = base64Image;

        setPastedImages((prev) => [
          ...prev,
          {
            id: imageId,
            name: imageName,
            base64: base64Image,
            type: file.type,
            size: file.size,
          },
        ]);

        resolve(img);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = useCallback(
    (e) => {
      if (!editorRef.current || isReadOnly) return;

      e.preventDefault();
      const clipboardData = e.clipboardData || window.clipboardData;

      if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];

        if (file.type.startsWith("image/")) {
          processPastedImage(file)
            .then((imgElement) => {
              const selection = window.getSelection();
              if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(imgElement);

                const space = document.createTextNode(" ");
                range.insertNode(space);

                range.setStartAfter(space);
                range.collapse(true);
              }
              setRichTextContent(editorRef.current.innerHTML);
            })
            .catch((error) => {
              console.error("Error processing pasted image:", error);
              const plainText = clipboardData.getData("text/plain");
              if (plainText) {
                document.execCommand("insertText", false, plainText);
              }
            });
          return;
        }
      }

      let htmlContent = clipboardData.getData("text/html");

      if (htmlContent) {
        htmlContent = cleanHtmlContent(htmlContent);
        insertHtmlSafely(htmlContent);
        return;
      }

      const plainText = clipboardData.getData("text/plain");
      if (plainText) {
        document.execCommand("insertText", false, plainText);
        setRichTextContent(editorRef.current.innerHTML);
      }
    },
    [isReadOnly],
  );

  const cleanHtmlContent = (html) => {
    html = html.replace(/<o:p>|<\/o:p>/gi, "");
    html = html.replace(/<w:.*?>|<\/w:.*?>/gi, "");
    html = html.replace(/<xml.*?>.*?<\/xml>/gi, "");
    html = html.replace(/ style="[^"]*"/gi, "");
    html = html.replace(/ class="[^"]*"/gi, "");
    html = html.replace(/ id="[^"]*"/gi, "");
    html = html
      .replace(/<b(\s[^>]*)?>/gi, "<strong>")
      .replace(/<\/b>/gi, "</strong>");
    html = html
      .replace(/<i(\s[^>]*)?>/gi, "<em>")
      .replace(/<\/i>/gi, "</em>");
    html = html.replace(/<p>\s*<\/p>/gi, "");
    html = html.replace(/<div>\s*<\/div>/gi, "");
    html = html.replace(/<span>\s*<\/span>/gi, "");
    html = html.replace(/\s+/g, " ").trim();

    return html;
  };

  const insertHtmlSafely = (htmlContent) => {
    try {
      document.execCommand("insertHTML", false, htmlContent);
    } catch (error) {
      console.error("Failed to insert HTML:", error);
      const plainText = htmlContent.replace(/<[^>]*>/g, "");
      document.execCommand("insertText", false, plainText);
    }

    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = useCallback(
    (e) => {
      if (isReadOnly) return;

      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      processPastedImage(file)
        .then((imgElement) => {
          if (editorRef.current) {
            editorRef.current.appendChild(imgElement);
            editorRef.current.appendChild(document.createTextNode(" "));
            setRichTextContent(editorRef.current.innerHTML);
            editorRef.current.scrollTop = editorRef.current.scrollHeight;
            toast.success("Image uploaded successfully");
          }
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image");
        });

      e.target.value = "";
    },
    [isReadOnly],
  );

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }
  }, []);

  const clearEditor = () => {
    if (isReadOnly) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      setRichTextContent("");
    }
    setPastedImages([]);
  };

  const formatText = (command, value = null) => {
    if (isReadOnly) return;

    document.execCommand(command, false, value);
    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Internal focus logic for grid source
  useEffect(() => {
    if (
      isOpen &&
      source === "grid" &&
      !hasFocusedRef.current &&
      !isReadOnly
    ) {
      const focusEditor = () => {
        if (editorRef.current && document.contains(editorRef.current)) {
          editorRef.current.focus();
          hasFocusedRef.current = true;
          return true;
        }
        return false;
      };

      const timeout1 = setTimeout(() => focusEditor(), 200);
      const timeout2 = setTimeout(() => focusEditor(), 400);
      const timeout3 = setTimeout(() => focusEditor(), 600);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [isOpen, source, isReadOnly]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasFocusedRef.current = false;
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedProjectData(null);
      setSelectedJobData(null);
      setApiError(null);
      setPastedImages([]);
      setRichTextContent("");
      setShowEmojiPicker(false);
      setShowColorPicker(false);
      setTaskTitle("");
    }
  }, [isOpen]);

  // Fetch all search data when modal opens
  useEffect(() => {
    const fetchAllSearchData = async () => {
      if (!isOpen || isReadOnly) return;

      try {
        const user = getCurrentUser();
        const response = await fetch(
          `${apiUrl}/SiteNote/SearchJobs?userId=${user.id}&search=`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch search data: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        const allData = data.results || data || [];
        setAllSearchData(allData);
      } catch (error) {
        console.error("Error fetching search data:", error);
        setApiError("Failed to load search data");
      }
    };

    fetchAllSearchData();
  }, [isOpen, apiUrl, isReadOnly]);

  // Fetch projects when workspace changes
  useEffect(() => {
    const fetchProjectsByWorkspace = async () => {
      if (isReadOnly) return;

      if (!selectedWorkspace) {
        setFilteredProjects([]);
        setSelectedProject("");
        setSelectedProjectData(null);
        return;
      }

      setIsLoadingProjects(true);
      try {
        const user = getCurrentUser();
        const response = await fetch(
          `${apiUrl}/Project/GetProjectsByUserJobPermission/${user.id}/${selectedWorkspace}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();
        const projectsData = data.projects || [];
        setFilteredProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setApiError("Failed to load projects");
        setFilteredProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjectsByWorkspace();
  }, [selectedWorkspace, apiUrl, isReadOnly]);

  // Fetch jobs when project changes
  useEffect(() => {
    const fetchJobsByProject = async () => {
      if (isReadOnly) return;

      if (!selectedProject) {
        setFilteredJobs([]);
        setSelectedJob("");
        setSelectedJobData(null);
        return;
      }

      setIsLoadingJobs(true);
      try {
        const user = getCurrentUser();
        const response = await fetch(
          `${apiUrl}/UserJobAuth/GetJobsByUserAndProject/${user.id}/${selectedProject}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const data = await response.json();
        const jobsData = data.jobs || [];
        setFilteredJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setApiError("Failed to load jobs");
        setFilteredJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobsByProject();
  }, [selectedProject, apiUrl, isReadOnly]);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedWorkspace("");
      setSelectedProject("");
      setSelectedJob("");
      setTaskTitle("");
      setRichTextContent("");
      setFilteredProjects([]);
      setFilteredJobs([]);
      setSelectedProjectData(null);
      setSelectedJobData(null);
      setIsSaving(false);
      setApiError(null);
      setPastedImages([]);
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  // Client-side search function
  const performSearch = useCallback(
    (query) => {
      if (!query.trim() || isReadOnly) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);

      setTimeout(() => {
        try {
          const lowerCaseQuery = query.toLowerCase().trim();

          const filtered = allSearchData.filter((item) => {
            if (!item) return false;

            const searchText = `
              ${item.workspaceName || ""} 
              ${item.projectName || ""} 
              ${item.jobName || ""}
              ${item.fullPath || ""}
            `.toLowerCase();

            return searchText.includes(lowerCaseQuery);
          });

          setSearchResults(filtered);
          setShowSearchResults(true);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [allSearchData, isReadOnly],
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim() && !isReadOnly) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch, isOpen, isReadOnly]);

  // Get project options for dropdown
  const getProjectOptions = () => {
    const options = [...filteredProjects];

    if (
      selectedProjectData &&
      (selectedProjectData.id || selectedProjectData.projectId)
    ) {
      const projectId = (
        selectedProjectData.id || selectedProjectData.projectId
      ).toString();
      const exists = options.some((p) => {
        const pId = (p.id || p.projectId)?.toString();
        return pId === projectId;
      });

      if (!exists) {
        options.push(selectedProjectData);
      }
    }

    return options.filter(
      (project) => project && (project.id || project.projectId),
    );
  };

  const handleColorSelect = (color) => {
    if (isReadOnly) return;

    if (color) {
      document.execCommand('foreColor', false, color);
      setSelectedColor(color);
    } else {
      document.execCommand('removeFormat', false, null);
      setSelectedColor("#000000");
    }

    if (editorRef.current) {
      setRichTextContent(editorRef.current.innerHTML);
    }

    setShowColorPicker(false);

    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Get job options for dropdown
  const getJobOptions = () => {
    const options = [...filteredJobs];

    if (selectedJobData && (selectedJobData.id || selectedJobData.jobId)) {
      const jobId = (selectedJobData.id || selectedJobData.jobId).toString();
      const exists = options.some((j) => {
        const jId = (j.id || j.jobId)?.toString();
        return jId === jobId;
      });

      if (!exists) {
        options.push(selectedJobData);
      }
    }

    return options.filter((job) => job && (job.id || job.jobId));
  };

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    async (result) => {
      if (!result || isReadOnly) return;

      setSelectedWorkspace("");
      setSelectedProject("");
      setSelectedJob("");
      setFilteredProjects([]);
      setFilteredJobs([]);
      setSelectedProjectData(null);
      setSelectedJobData(null);
      setApiError(null);

      try {
        if (result.workspaceId) {
          const matchingWorkspace = userworksaces.find(
            (workspace) =>
              workspace &&
              workspace.id &&
              workspace.id.toString() === result.workspaceId.toString(),
          );
          if (matchingWorkspace) {
            setSelectedWorkspace(matchingWorkspace.id.toString());
          }
        }

        if (result.projectId) {
          setIsLoadingProjects(true);
          try {
            const projectResponse = await fetch(
              `${apiUrl}/Project/GetProjectById/${result.projectId}`,
            );

            if (projectResponse.ok) {
              const projectData = await projectResponse.json();
              const normalizedProject = normalizeProjectData(
                projectData,
                result,
              );
              if (normalizedProject) {
                setSelectedProjectData(normalizedProject);
                setSelectedProject(normalizedProject.id.toString());
              }
            }
          } catch (projectError) {
            const fallbackProject = normalizeProjectData(null, result);
            if (fallbackProject) {
              setSelectedProjectData(fallbackProject);
              setSelectedProject(fallbackProject.id.toString());
            }
          }
        }

        if (result.jobId) {
          await new Promise((resolve) => setTimeout(resolve, 100));

          setIsLoadingJobs(true);
          try {
            const jobResponse = await fetch(
              `${apiUrl}/Job/GetJobById/${result.jobId}`,
            );

            if (jobResponse.ok) {
              const jobData = await jobResponse.json();
              const normalizedJob = normalizeJobData(jobData, result);
              if (normalizedJob) {
                setSelectedJobData(normalizedJob);
                setSelectedJob(normalizedJob.id.toString());
              }
            }
          } catch (jobError) {
            const fallbackJob = normalizeJobData(null, result);
            if (fallbackJob) {
              setSelectedJobData(fallbackJob);
              setSelectedJob(fallbackJob.id.toString());
            }
          }
        }
      } catch (error) {
        console.error("Error in search result selection:", error);
        setApiError(`Failed to load selection: ${error.message}`);
      } finally {
        setIsLoadingProjects(false);
        setIsLoadingJobs(false);
      }

      setSearchQuery("");
      setShowSearchResults(false);
      setSearchResults([]);

      setTimeout(() => {
        if (editorRef.current && !isReadOnly) {
          editorRef.current.focus();
        }
      }, 500);
    },
    [userworksaces, apiUrl, isReadOnly],
  );

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchResults]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showColorPicker &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target) &&
        !event.target.closest('.color-button')
      ) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColorPicker]);

  // Prepare description content with images
  const prepareDescriptionContent = () => {
    if (isReadOnly) return "";

    if (pastedImages.length === 0) {
      let cleanContent = richTextContent;
      if (cleanContent) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = cleanContent;

        const images = tempDiv.querySelectorAll("img");
        images.forEach((img) => img.remove());

        cleanContent = cleanHtml(tempDiv.innerHTML);
      }
      return cleanContent || "";
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = richTextContent;

    const images = tempDiv.querySelectorAll("img[data-image-id]");
    images.forEach((img) => {
      img.remove();
    });

    let cleanContent = tempDiv.innerHTML;
    cleanContent = cleanHtml(cleanContent);

    return cleanContent;
  };

  // Helper function to clean HTML
  const cleanHtml = (htmlContent) => {
    if (!htmlContent || htmlContent.trim() === "") {
      return "";
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    const emptyElements = tempDiv.querySelectorAll(
      "div:empty, p:empty, span:empty, br:only-child",
    );
    emptyElements.forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector("*")) {
        el.remove();
      }
    });

    const blockElements = tempDiv.querySelectorAll("div, p");
    blockElements.forEach((block) => {
      let firstChild = block.firstChild;
      while (
        firstChild &&
        ((firstChild.nodeType === Node.ELEMENT_NODE &&
          firstChild.tagName === "BR") ||
          (firstChild.nodeType === Node.TEXT_NODE &&
            !firstChild.textContent.trim()))
      ) {
        const nextSibling = firstChild.nextSibling;
        firstChild.remove();
        firstChild = nextSibling;
      }

      let lastChild = block.lastChild;
      while (
        lastChild &&
        ((lastChild.nodeType === Node.ELEMENT_NODE &&
          lastChild.tagName === "BR") ||
          (lastChild.nodeType === Node.TEXT_NODE &&
            !lastChild.textContent.trim()))
      ) {
        const previousSibling = lastChild.previousSibling;
        lastChild.remove();
        lastChild = previousSibling;
      }

      const brElements = block.querySelectorAll("br");
      brElements.forEach((br) => {
        if (
          br.nextSibling &&
          br.nextSibling.nodeType === Node.ELEMENT_NODE &&
          br.nextSibling.tagName === "BR"
        ) {
          br.remove();
        }
      });
    });

    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    const emptyTextNodes = [];
    let node = walker.nextNode();
    while (node) {
      emptyTextNodes.push(node);
      node = walker.nextNode();
    }

    emptyTextNodes.forEach((node) => node.remove());

    let cleanedHtml = tempDiv.innerHTML;

    cleanedHtml = cleanedHtml
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/\s+$/g, "")
      .replace(/^\s+/g, "")
      .trim();

    cleanedHtml = cleanedHtml
      .replace(/<div><\/div>/g, "")
      .replace(/<p><\/p>/g, "")
      .replace(/<span><\/span>/g, "")
      .replace(/<div>\s*<\/div>/g, "")
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<span>\s*<\/span>/g, "");

    return cleanedHtml;
  };

// Save task to JobTasks endpoint
const handleSave = async () => {
  if (isReadOnly) return;

  const newErrors = {};
  if (!selectedJob) newErrors.job = "Please select a job";
  if (!taskTitle.trim()) newErrors.title = "Task title is required";

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  setIsSaving(true);
  setApiError(null);

  try {
    const user = getCurrentUser();
    
    // Current date in ISO format
    const now = new Date().toISOString();

    // Get description content (will be empty string if no content)
    let descriptionContent = prepareDescriptionContent();
    
    // If description is empty, use task title as description
    const hasTextContent = descriptionContent.replace(/<[^>]*>/g, "").trim();
    if (!hasTextContent && pastedImages.length === 0) {
      descriptionContent = taskTitle.trim();
    }

    const taskData = {
      title: taskTitle.trim(),
      description: descriptionContent,
      startDate: now,
      endDate: now,
      dueDate: now,
      assigneeId: user.id,
      createdById: user.id,
      jobId: parseInt(selectedJob, 10),
      status: 1 // Active status
    };

    console.log("Saving task with data:", taskData);

    const response = await fetch(`${apiUrl}/JobTasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to save task";
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.title || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const savedTask = await response.json();
    
    toast.success("Task saved successfully!");

    // Refresh notes or tasks list
    if (refreshNotes) {
      await refreshNotes();
    }

    onClose();
  } catch (error) {
    console.error("Save error:", error);
    setApiError(error.message || "Failed to save task");
    toast.error("Failed to save task");
  } finally {
    setIsSaving(false);
  }
};

  // Keyboard shortcut for save
  const handleSaveShortcut = useCallback(
    (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        !isSaving &&
        !isReadOnly
      ) {
        event.preventDefault();
        handleSave();
      }
    },
    [isSaving, handleSave, isReadOnly],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleSaveShortcut);
      return () =>
        document.removeEventListener("keydown", handleSaveShortcut);
    }
  }, [isOpen, handleSaveShortcut]);

  useEffect(() => {
    if (!isOpen) return;

    const hasErrors = apiError || (errors && Object.keys(errors).length > 0);
    if (hasErrors && modalRef.current) {
      try {
        if (typeof modalRef.current.scrollTo === "function") {
          modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          modalRef.current.scrollTop = 0;
        }
      } catch (e) {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (_) {}
      }
    }
  }, [apiError, errors, isOpen]);

  // Search component
  const renderSearchSection = () => (
    <div className="search-section">
      <div
        className="form-group full-width search-container"
        ref={searchInputRef}
      >
        <label>🔍 Quick Search</label>
        <div className="search-input-wrapper" style={{ width: "100%" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search for workspace, project, or job..."
            className="search-input"
            style={{ width: "100%" }}
            disabled={isReadOnly}
          />
          {isSearching && !isReadOnly && (
            <div className="search-spinner">🔍 Searching...</div>
          )}
        </div>

        {showSearchResults && searchResults.length > 0 && !isReadOnly && (
          <div className="search-results-dropdown" style={{ width: "100%" }}>
            <div className="search-results-header">
              Found {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </div>
            {searchResults.map((result, index) => (
              <div
                key={`${result.workspaceId}-${result.projectId}-${result.jobId}-${index}`}
                className="search-result-item"
                onClick={() => handleSearchResultSelect(result)}
              >
                <div className="search-result-fullpath">
                  {result.fullPath ||
                    `${result.workspaceName} → ${result.projectName} → ${result.jobName}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSearchResults &&
          searchQuery &&
          searchResults.length === 0 &&
          !isSearching &&
          !isReadOnly && (
            <div
              className="search-results-dropdown"
              style={{ width: "100%" }}
            >
              <div className="search-no-results">
                No results found for "<strong>{searchQuery}</strong>"
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  Try searching with different keywords
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );

  // Editor toolbar component
  const renderEditorToolbar = () => (
    <div className="editor-toolbar">
      <div className="editor-formatting-tools">
        <button
          onClick={() => formatText("bold")}
          title="Bold"
          disabled={isReadOnly}
          className={isReadOnly ? "disabled" : ""}
        >
          <i className="fas fa-bold"></i>
        </button>
        <button
          onClick={() => formatText("italic")}
          title="Italic"
          disabled={isReadOnly}
          className={isReadOnly ? "disabled" : ""}
        >
          <i className="fas fa-italic"></i>
        </button>
        <button
          onClick={() => formatText("underline")}
          title="Underline"
          disabled={isReadOnly}
          className={isReadOnly ? "disabled" : ""}
        >
          <i className="fas fa-underline"></i>
        </button>

        <div className="color-picker-wrapper" style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => !isReadOnly && setShowColorPicker(!showColorPicker)}
            title={isReadOnly ? "Read-only mode" : "Text Color"}
            className={`color-button ${showColorPicker ? "active" : ""} ${isReadOnly ? "disabled" : ""}`}
            disabled={isReadOnly}
            type="button"
            style={{
              border: `2px solid ${selectedColor}`,
              backgroundColor: "white"
            }}
          >
            <i className="fas fa-palette" style={{ color: selectedColor }}></i>
          </button>

          {showColorPicker && !isReadOnly && (
            <div className="color-picker-dropdown" ref={colorPickerRef}>
              <div className="color-picker-header">
                <span>Text Color</span>
                <button onClick={() => setShowColorPicker(false)} className="close-color-picker">×</button>
              </div>
              <div className="color-grid">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`color-option ${selectedColor === color.value ? "selected" : ""}`}
                    style={{
                      backgroundColor: color.value,
                      border: selectedColor === color.value ? '3px solid #333' : '2px solid transparent'
                    }}
                    onClick={() => handleColorSelect(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="color-picker-footer">
                <button
                  className="remove-color-button"
                  onClick={() => handleColorSelect(null)}
                >
                  Remove Color
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => formatText("insertUnorderedList")}
          title="Bullet List"
          disabled={isReadOnly}
          className={isReadOnly ? "disabled" : ""}
        >
          <i className="fas fa-list-ul"></i>
        </button>
        <button
          onClick={() => formatText("insertOrderedList")}
          title="Numbered List"
          disabled={isReadOnly}
          className={isReadOnly ? "disabled" : ""}
        >
          <i className="fas fa-list-ol"></i>
        </button>

        {/* Emoji Picker Button */}
        <div
          className="emoji-picker-wrapper"
          style={{ position: "relative" }}
        >
          <button
            ref={emojiButtonRef}
            onClick={() =>
              !isReadOnly && setShowEmojiPicker(!showEmojiPicker)
            }
            title={isReadOnly ? "Read-only mode" : "Insert Emoji"}
            className={`emoji-button ${showEmojiPicker ? "active" : ""} ${isReadOnly ? "disabled" : ""}`}
            disabled={isReadOnly}
            type="button"
          >
            <i className="far fa-smile"></i>
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && !isReadOnly && (
            <div className="emoji-picker-container">
              <emoji-picker
                ref={emojiPickerRef}
                class="emoji-picker"
                style={{
                  "--background": "#ffffff",
                  "--border-color": "#e0e0e0",
                  "--border-radius": "8px",
                  "--button-active-background": "#f0f0f0",
                  "--button-hover-background": "#f5f5f5",
                  "--category-emoji-padding": "8px",
                  "--category-emoji-size": "24px",
                  "--category-font-color": "#666",
                  "--category-font-size": "13px",
                  "--indicator-color": "#007bff",
                  "--input-border-color": "#e0e0e0",
                  "--input-border-radius": "20px",
                  "--input-font-color": "#333",
                  "--input-placeholder-color": "#999",
                  "--num-columns": "8",
                  "--outline-color": "#007bff80",
                  width: "350px",
                  height: "400px",
                }}
              ></emoji-picker>
            </div>
          )}
        </div>

        <div className="image-upload-wrapper">
          <label
            htmlFor="image-upload"
            className={`image-upload-button ${isReadOnly ? "disabled" : ""}`}
            title={isReadOnly ? "Read-only mode" : "Upload Image"}
          >
            <i className="fas fa-image"></i>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isReadOnly}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <button
          onClick={clearEditor}
          title={isReadOnly ? "Read-only mode" : "Clear All"}
          className={`clear-button ${isReadOnly ? "disabled" : ""}`}
          disabled={isReadOnly}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>

      {pastedImages.length > 0 && !isReadOnly && (
        <div className="image-counter">
          <i className="fas fa-images"></i> {pastedImages.length} image
          {pastedImages.length !== 1 ? "s" : ""} attached
        </div>
      )}
    </div>
  );

  // Editor content component for task description
  const renderEditorContent = () => {
    return (
      <div className="editor-content-container">
        <div className="form-group">
          
          {!isReadOnly && renderEditorToolbar()}

          <div
            ref={editorRef}
            contentEditable={!isReadOnly}
            className={`rich-text-editor ${isReadOnly ? "read-only" : ""}`}
            onPaste={handlePaste}
            onInput={handleEditorInput}
            placeholder={
              isReadOnly
                ? "Read-only mode - Cannot edit"
                : "Type your task description here and paste images..."
            }
            suppressContentEditableWarning={true}
            style={{
              pointerEvents: isReadOnly ? "none" : "auto",
              opacity: isReadOnly ? 0.7 : 1,
              backgroundColor: isReadOnly ? "#f5f5f5" : "#fff",
              cursor: isReadOnly ? "not-allowed" : "text",
            }}
          />

          {pastedImages.length > 0 && !isReadOnly && (
            <div className="image-upload-status">
              <i className="fas fa-images"></i>
              {pastedImages.length} image
              {pastedImages.length !== 1 ? "s" : ""} attached
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main content
  const projectOptions = getProjectOptions();
  const jobOptions = getJobOptions();

  return isOpen ? (
    <div className="edit-note-modal-overlay">
      <div className="edit-note-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>New Task</h2>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        {apiError && (
          <div className="error-message">
            {apiError}
            <button
              onClick={() => setApiError(null)}
              className="dismiss-error"
            >
              ×
            </button>
          </div>
        )}

        {!isReadOnly && renderSearchSection()}

        <div className="form-group">
          <label>Workspace</label>
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            disabled={isReadOnly}
          >
            <option value="">Select Workspace</option>
            {userworksaces.map(
              (workspace) =>
                workspace &&
                workspace.id && (
                  <option key={workspace.id} value={workspace.id.toString()}>
                    {workspace.name}
                  </option>
                ),
            )}
          </select>
        </div>

        <div className="form-group">
          <label>
            Project{" "}
            {errors.project && (
              <span className="error-message-inline">{errors.project}</span>
            )}
          </label>
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              const selectedProjectObj = projectOptions.find((p) => {
                const pId = (p.id || p.projectId)?.toString();
                return pId === e.target.value;
              });
              setSelectedProjectData(selectedProjectObj || null);
              setErrors((prev) => ({
                ...prev,
                project: undefined,
                job: undefined,
              }));
            }}
            disabled={!selectedWorkspace || isLoadingProjects || isReadOnly}
          >
            <option value="">Select Project</option>
            {isLoadingProjects ? (
              <option value="" disabled>
                Loading projects...
              </option>
            ) : (
              projectOptions.map((project) => {
                const projectId = (
                  project.id || project.projectId
                )?.toString();
                const projectName =
                  project.name || project.projectName || "Unnamed Project";

                return projectId ? (
                  <option key={projectId} value={projectId}>
                    {projectName}
                  </option>
                ) : null;
              })
            )}
          </select>
        </div>

        <div className="form-group">
          <label>
            Job{" "}
            {errors.job && (
              <span className="error-message-inline">{errors.job}</span>
            )}
          </label>
          <select
            value={selectedJob}
            onChange={(e) => {
              setSelectedJob(e.target.value);
              const selectedJobObj = jobOptions.find((j) => {
                const jId = (j.id || j.jobId)?.toString();
                return jId === e.target.value;
              });
              setSelectedJobData(selectedJobObj || null);
              setErrors((prev) => ({ ...prev, job: undefined }));
            }}
            disabled={!selectedProject || isLoadingJobs || isReadOnly}
          >
            <option value="">Select Job</option>
            {isLoadingJobs ? (
              <option value="" disabled>
                Loading jobs...
              </option>
            ) : (
              jobOptions.map((job) => {
                const jobId = (job.id || job.jobId)?.toString();
                const jobName = job.jobName || job.name || "Unnamed Job";

                return jobId ? (
                  <option key={jobId} value={jobId}>
                    {jobName}
                  </option>
                ) : null;
              })
            )}
          </select>
        </div>

        <div className="form-group">
          <label>
            Task Title{" "}
            {errors.title && (
              <span className="error-message-inline">{errors.title}</span>
            )}
          </label>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => {
              setTaskTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="Enter task title"
            disabled={isReadOnly}
          />
        </div>

        {renderEditorContent()}

        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          {!isReadOnly && (
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Task"}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;
};

NewTaskModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  refreshNotes: PropTypes.func,
  refreshFilteredNotes: PropTypes.func,
  userworksaces: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      text: PropTypes.string,
    }),
  ),
  source: PropTypes.oneOf(["grid", "dashboard"]),
  defaultWorkspaceRole: PropTypes.number,
  fetchNotesWithFilters: PropTypes.func,
  selectedFilters: PropTypes.object,
  hasActiveFilters: PropTypes.bool,
  viewMode: PropTypes.string,
  refreshStackedView: PropTypes.func,
  hasActiveSearchText: PropTypes.bool,
  performSearching: PropTypes.func,
  searchTerm: PropTypes.string,
};

NewTaskModal.defaultProps = {
  refreshNotes: null,
  refreshFilteredNotes: null,
  userworksaces: [],
  source: "dashboard",
  defaultWorkspaceRole: null,
  fetchNotesWithFilters: null,
  selectedFilters: {},
  hasActiveFilters: false,
  viewMode: "cards",
  refreshStackedView: null,
  hasActiveSearchText: false,
  performSearching: null,
  searchTerm: "",
};

export default NewTaskModal;