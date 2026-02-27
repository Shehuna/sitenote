import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import "./NewNoteModal.css";
import toast from "react-hot-toast";
import * as signalR from "@microsoft/signalr";
import "emoji-picker-element";

const NewNoteModal = forwardRef(
  (
    {
      isOpen,
      onClose,
      refreshNotes,
      refreshFilteredNotes,
      addSiteNote,
      prefilledData = null,
      defWorkSpaceId,
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
    },
    ref,
  ) => {
    // State declarations - REMOVE text mode states
    const [activeTab, setActiveTab] = useState("journal");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("1");
    const [selectedJob, setSelectedJob] = useState("");
    const [selectedWorkspace, setSelectedWorkspace] = useState("");
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [documents, setDocuments] = useState([]);
    const [newDocument, setNewDocument] = useState({ name: "", file: null });
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocumentBeingEdited, setCurrentDocumentBeingEdited] =
      useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [fetchedProjects, setFetchedProjects] = useState([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const connectionRef = useRef(null);
    const [isSignalRConnected, setIsSignalRConnected] = useState(false);
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

    // Rich text editor states - KEEP ONLY rich text
    const [richTextContent, setRichTextContent] = useState("");
    const [pastedImages, setPastedImages] = useState([]); // Store pasted images as Base64

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

   console.log(hasActiveSearchText)
    // Constants
    const ALLOWED_FILE_TYPES = {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "image/svg+xml": [".svg"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
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

    // Initialize SignalR connection when modal opens
    useEffect(() => {
      if (isOpen && !isReadOnly) {
        // Don't connect SignalR if read-only
        const connectSignalR = async () => {
          try {
            const connection = new signalR.HubConnectionBuilder()
              .withUrl(
                `${process.env.REACT_APP_API_BASE_URL}/hubs/uploadprogress`,
              )
              .withAutomaticReconnect()
              .build();

            await connection.start();
            connectionRef.current = connection;
            setIsSignalRConnected(true);

            console.log(
              "SignalR Connected - Connection ID:",
              connection.connectionId,
            );

            // Listen for progress updates
            connection.on("ReceiveProgress", (progress) => {
              console.log("Upload progress:", progress);
            });
          } catch (err) {
            console.warn(
              "SignalR connection failed, continuing without upload progress",
              err,
            );
            setIsSignalRConnected(false);
          }
        };

        connectSignalR();

        return () => {
          if (connectionRef.current) {
            connectionRef.current.stop();
            connectionRef.current = null;
            setIsSignalRConnected(false);
          }
        };
      }
    }, [isOpen, isReadOnly]);

    // Initialize emoji picker
    // Replace the entire emoji picker useEffect with this:
    useEffect(() => {
      if (isOpen && !isReadOnly) {
        let handleClickOutside;

        if (emojiPickerRef.current) {
          // Add debugging to see what event is received
          const handleEmojiClick = (event) => {
            console.log("Emoji click event received:", event);
            console.log("Event type:", event.type);
            console.log("Event detail:", event.detail);
            console.log("Event target:", event.target);

            if (!editorRef.current || isReadOnly) return;

            // Try different ways to extract the emoji
            let emojiChar = "";

            // Method 1: Check event.detail directly
            if (event.detail) {
              console.log("event.detail structure:", event.detail);

              // Try to extract emoji from different possible structures
              if (typeof event.detail === "string") {
                emojiChar = event.detail;
                console.log("Found string emoji:", emojiChar);
              } else if (event.detail.unicode) {
                emojiChar = event.detail.unicode;
                console.log("Found unicode emoji:", emojiChar);
              } else if (event.detail.native) {
                emojiChar = event.detail.native;
                console.log("Found native emoji:", emojiChar);
              } else if (event.detail.emoji) {
                emojiChar = event.detail.emoji;
                console.log("Found emoji property:", emojiChar);
              } else {
                // Try to stringify and extract
                const str = JSON.stringify(event.detail);
                console.log("Stringified detail:", str);

                // Try to find emoji in the string
                const emojiMatch = str.match(
                  /["']?([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])["']?/u,
                );
                if (emojiMatch) {
                  emojiChar = emojiMatch[1];
                  console.log("Extracted emoji from string:", emojiChar);
                }
              }
            }

            // If still no emoji, try to get it from the target
            if (!emojiChar && event.target) {
              console.log("Trying to get emoji from target:", event.target);

              // Check if target has data-emoji or similar attributes
              if (event.target.getAttribute("data-emoji")) {
                emojiChar = event.target.getAttribute("data-emoji");
                console.log("Found emoji in data-emoji:", emojiChar);
              } else if (event.target.textContent) {
                const text = event.target.textContent.trim();
                // Check if text contains an emoji
                const emojiRegex =
                  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
                const match = text.match(emojiRegex);
                if (match) {
                  emojiChar = match[0];
                  console.log("Found emoji in textContent:", emojiChar);
                }
              }
            }

            // Fallback if we still can't find an emoji
            if (!emojiChar) {
              emojiChar = "❓";
              console.log("Using fallback emoji");
            }

            console.log("Final emoji character to insert:", emojiChar);

            // Insert emoji at cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const emojiNode = document.createTextNode(emojiChar);
              range.deleteContents();
              range.insertNode(emojiNode);

              // Move cursor after the emoji
              range.setStartAfter(emojiNode);
              range.setEndAfter(emojiNode);
              selection.removeAllRanges();
              selection.addRange(range);

              // Update content
              setRichTextContent(editorRef.current.innerHTML);
            }

            // Close emoji picker
            setShowEmojiPicker(false);

            // Focus back on editor
            if (editorRef.current) {
              editorRef.current.focus();
            }
          };

          // Add event listener
          emojiPickerRef.current.addEventListener(
            "emoji-click",
            handleEmojiClick,
          );

          // Also try to listen for click events on the picker itself
          emojiPickerRef.current.addEventListener("click", (e) => {
            console.log("Emoji picker click event:", e);
            console.log("Clicked element:", e.target);
            console.log("Clicked element class:", e.target.className);
            console.log("Clicked element innerHTML:", e.target.innerHTML);
          });

          // Store for cleanup
          emojiPickerRef.current._handleEmojiClick = handleEmojiClick;

          // Set up click outside to close
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
          // Cleanup event listener
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

          // Cleanup click outside listener
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

          // Create image element with proper styling
          const img = document.createElement("img");
          img.src = base64Image;
          img.alt = "Pasted image";

          // Set class instead of inline styles
          img.className = "editor-image";

          // Set attributes
          img.dataset.imageId = imageId;
          img.dataset.imageName = imageName;
          img.dataset.imageBase64 = base64Image;

          // Store image data
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
        if (isReadOnly) return; // Disable image upload if read-only

        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
          toast.error("Please select an image file");
          return;
        }

        processPastedImage(file)
          .then((imgElement) => {
            if (editorRef.current) {
              // Insert at the end with minimal spacing
              editorRef.current.appendChild(imgElement);

              // Add a single space for editing
              editorRef.current.appendChild(document.createTextNode(" "));

              // Update content
              setRichTextContent(editorRef.current.innerHTML);

              // Scroll to the bottom
              editorRef.current.scrollTop = editorRef.current.scrollHeight;

              toast.success(
                "Image uploaded successfully - will be saved separately",
              );
            }
          })
          .catch((error) => {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
          });

        // Reset file input
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
      if (isReadOnly) return; // Disable clear editor if read-only

      if (editorRef.current) {
        editorRef.current.innerHTML = "";
        setRichTextContent("");
      }
      setPastedImages([]);
    };

    const formatText = (command, value = null) => {
      if (isReadOnly) return; // Disable formatting if read-only

      document.execCommand(command, false, value);
      if (editorRef.current) {
        setRichTextContent(editorRef.current.innerHTML);
      }

      // Focus back on editor
      if (editorRef.current) {
        editorRef.current.focus();
      }
    };

    // Expose focus method to parent component - KEEP SAME NAME
    useImperativeHandle(ref, () => ({
      focusTextarea: () => {
        if (editorRef.current) {
          const focus = () => {
            editorRef.current.focus();
          };

          setTimeout(focus, 100);
          setTimeout(focus, 300);
          setTimeout(focus, 500);
        }
      },
    }));

    // Internal focus logic for grid source - SIMPLIFIED
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
        setShowEmojiPicker(false); // Close emoji picker when modal closes
        setShowColorPicker(false);
      }
    }, [isOpen]);

    // Fetch all search data when modal opens
    useEffect(() => {
      const fetchAllSearchData = async () => {
        if (!isOpen || isReadOnly) return; // Don't fetch if read-only

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

    // Fetch projects when workspace changes OR when prefilled data is provided
    useEffect(() => {
      const fetchProjectsByWorkspace = async () => {
        if (isReadOnly) return; // Don't fetch if read-only

        if (
          prefilledData?.projectId &&
          selectedWorkspace === prefilledData.workspaceId?.toString()
        ) {
          return;
        }

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
    }, [selectedWorkspace, apiUrl, prefilledData, isReadOnly]);

    // Fetch jobs when project changes OR when prefilled data is provided
    useEffect(() => {
      const fetchJobsByProject = async () => {
        if (isReadOnly) return; // Don't fetch if read-only

        if (
          prefilledData?.jobId &&
          selectedProject === prefilledData.projectId?.toString()
        ) {
          return;
        }

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
    }, [selectedProject, apiUrl, prefilledData, isReadOnly]);

    // Initialize modal state when opened
    useEffect(() => {
      if (isOpen) {
        const today = new Date();
        const formattedDate = today.toISOString().split("T")[0];
        setSelectedDate(prefilledData?.date || formattedDate);

        setActiveTab("journal");
        setSelectedPriority("1");

        if (!prefilledData) {
          setSelectedWorkspace("");
          setSelectedProject("");
          setSelectedJob("");
          setRichTextContent("");
          setFilteredProjects([]);
          setFilteredJobs([]);
          setSelectedProjectData(null);
          setSelectedJobData(null);
        }

        setDocuments([]);
        setNewDocument({ name: "", file: null });
        setShowDocumentModal(false);
        setCurrentDocumentBeingEdited(null);
        setErrors({});
        setIsSaving(false);
        setApiError(null);
        setPastedImages([]);
        setShowEmojiPicker(false);
      }
    }, [isOpen, prefilledData]);

    // Handle prefilled data for workspace, project, and job
    useEffect(() => {
      if (isOpen && prefilledData && !isReadOnly) {
        if (prefilledData.date) {
          setSelectedDate(prefilledData.date);
        }

        if (prefilledData.workspaceId) {
          setSelectedWorkspace(prefilledData.workspaceId.toString());
        } else if (prefilledData.workspace) {
          const workspace = userworksaces.find(
            (w) =>
              w &&
              w.name &&
              (w.name === prefilledData.workspace ||
                w.text === prefilledData.workspace),
          );
          if (workspace) {
            setSelectedWorkspace(workspace.id.toString());
          }
        }

        if (prefilledData.projectId) {
          const projectData = {
            id: prefilledData.projectId,
            projectId: prefilledData.projectId,
            name: prefilledData.project || "Project",
            workspaceId: prefilledData.workspaceId,
          };
          setSelectedProjectData(projectData);
          setSelectedProject(prefilledData.projectId.toString());
        }

        if (prefilledData.jobId) {
          const jobData = {
            id: prefilledData.jobId,
            jobId: prefilledData.jobId,
            name: prefilledData.job || "Job",
            projectId: prefilledData.projectId,
          };
          setSelectedJobData(jobData);
          setSelectedJob(prefilledData.jobId.toString());
        }
      }
    }, [isOpen, prefilledData, userworksaces, isReadOnly]);

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

    // Handle search result selection - UPDATED
    const handleSearchResultSelect = useCallback(
      async (result) => {
        if (!result || isReadOnly) return; // Disable selection if read-only

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

    // Prepare note content with images
    const prepareNoteContent = () => {
      // If read-only, return empty content
      if (isReadOnly) return "";

      // If there are no pasted images, return the content as-is
      if (pastedImages.length === 0) {
        // Still clean up any potential empty elements
        let cleanContent = richTextContent;
        if (cleanContent) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = cleanContent;

          // Remove any image elements
          const images = tempDiv.querySelectorAll("img");
          images.forEach((img) => img.remove());

          // Clean up empty elements
          cleanContent = cleanHtml(tempDiv.innerHTML);
        }
        return cleanContent || "";
      }

      // Create a temporary div to work with the content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = richTextContent;

      // Remove image elements completely
      const images = tempDiv.querySelectorAll("img[data-image-id]");
      images.forEach((img) => {
        img.remove();
      });

      // Get the cleaned HTML
      let cleanContent = tempDiv.innerHTML;

      // Clean up the HTML to remove empty elements and excessive whitespace
      cleanContent = cleanHtml(cleanContent);

      return cleanContent;
    };

    // Helper function to clean HTML and remove empty elements/whitespace
    const cleanHtml = (htmlContent) => {
      if (!htmlContent || htmlContent.trim() === "") {
        return "";
      }

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      // Remove empty elements
      const emptyElements = tempDiv.querySelectorAll(
        "div:empty, p:empty, span:empty, br:only-child",
      );
      emptyElements.forEach((el) => {
        // Check if element is truly empty or just has whitespace
        if (!el.textContent.trim() && !el.querySelector("*")) {
          el.remove();
        }
      });

      // Remove <br> tags that are at the beginning or end of block elements
      const blockElements = tempDiv.querySelectorAll("div, p");
      blockElements.forEach((block) => {
        // Remove leading <br> tags
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

        // Remove trailing <br> tags
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

        // Remove consecutive <br> tags
        const brElements = block.querySelectorAll("br");
        brElements.forEach((br, index) => {
          if (
            br.nextSibling &&
            br.nextSibling.nodeType === Node.ELEMENT_NODE &&
            br.nextSibling.tagName === "BR"
          ) {
            br.remove();
          }
        });
      });

      // Remove empty text nodes
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

      // Get the cleaned HTML
      let cleanedHtml = tempDiv.innerHTML;

      // Remove excessive whitespace in text
      cleanedHtml = cleanedHtml
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/>\s+</g, "><") // Remove whitespace between tags
        .replace(/\s+$/g, "") // Remove trailing whitespace
        .replace(/^\s+/g, "") // Remove leading whitespace
        .trim();

      // Remove empty tags that might have been created
      cleanedHtml = cleanedHtml
        .replace(/<div><\/div>/g, "")
        .replace(/<p><\/p>/g, "")
        .replace(/<span><\/span>/g, "")
        .replace(/<div>\s*<\/div>/g, "")
        .replace(/<p>\s*<\/p>/g, "")
        .replace(/<span>\s*<\/span>/g, "");

      return cleanedHtml;
    };

    // Document upload function with SignalR support
    const uploadDocumentWithSignalR = async (doc, siteNoteId, userId) => {
      if (!doc.file) {
        throw new Error("No file selected for upload");
      }

      const formData = new FormData();
      formData.append("Name", doc.name);
      formData.append("File", doc.file);
      formData.append("SiteNoteId", siteNoteId);
      formData.append("UserId", userId);

      const headers = {};

      // Only add SignalR header if connected
      if (isSignalRConnected && connectionRef.current?.connectionId) {
        headers["X-Connection-Id"] = connectionRef.current.connectionId;
        console.log(
          "Using SignalR connection ID:",
          connectionRef.current.connectionId,
        );
      } else {
        console.warn(
          "SignalR not connected, uploading without progress tracking",
        );
      }

      const response = await fetch(`${apiUrl}/Documents/AddDocument`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Upload failed";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage =
            errorData.message || errorData.errors?.Name?.[0] || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    };

    const uploadInlineImage = async (doc, siteNoteId, userId) => {
      if (!doc.file) {
        throw new Error("No file selected for upload");
      }

      const formData = new FormData();

      // Append the file with correct field name
      formData.append("File", doc.file);

      // Append other required fields
      formData.append("SiteNoteId", siteNoteId);
      formData.append("UserId", userId);

      // Optional: add description or name if API supports it
      if (doc.name) {
        formData.append("Description", doc.name);
      }

      console.log("Uploading inline image:", {
        fileName: doc.file.name,
        fileSize: doc.file.size,
        siteNoteId,
        userId,
      });

      const response = await fetch(`${apiUrl}/InlineImages/UploadInlineImage`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Image upload failed";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage =
            errorData.message || errorData.errors?.File?.[0] || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }

        console.error("Inline image upload failed:", errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Inline image upload success:", result);
      return result;
    };

    // Save journal note with image handling
    const handleSaveJournal = async () => {
      if (isReadOnly) return; // Don't save if read-only

      const newErrors = {};
      if (!selectedProject) newErrors.project = "Please select a project";
      if (!selectedJob) newErrors.job = "Please select a job";
      if (!selectedDate) newErrors.date = "Please select a date";

      // Get cleaned note content
      const noteHtmlContent = prepareNoteContent();

      // Check if there's any content (text OR images)
      const hasTextContent = noteHtmlContent.replace(/<[^>]*>/g, "").trim();
      const hasImages = pastedImages.length > 0;

      if (!hasTextContent && !hasImages) {
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

        // Save the cleaned note content
        const noteData = {
          note: noteHtmlContent, // Save the cleaned HTML content
          date: new Date(selectedDate).toISOString(),
          taskId: prefilledData.taskid,
          userId: user.id,
        };

        const savedNote = await addSiteNote(noteData);
        const siteNoteId = savedNote.siteNoteId;

        if (!siteNoteId) {
          throw new Error("Failed to retrieve SiteNoteId from the saved note.");
        }

        // Upload documents with SignalR support
        for (const doc of documents) {
          if (doc.file) {
            try {
              await uploadDocumentWithSignalR(doc, siteNoteId, user.id);
              console.log(`Document "${doc.name}" uploaded successfully`);
            } catch (err) {
              console.error(`Error uploading document "${doc.name}":`, err);
              // Continue with other documents even if one fails
              toast.error(
                `Failed to upload document "${doc.name}": ${err.message}`,
              );
            }
          }
        }

        // Upload pasted images separately to the inline images endpoint
        if (pastedImages.length > 0) {
          const imageUploadPromises = pastedImages.map(async (image, index) => {
            try {
              // Convert base64 to blob
              const base64Response = await fetch(image.base64);
              const blob = await base64Response.blob();

              // Create a file from blob
              const file = new File([blob], image.name, { type: image.type });

              // Upload as inline image
              const imageDoc = {
                name: image.name,
                file: file,
                fileName: image.name,
              };

              console.log(
                `Uploading image "${image.name}" to inline images endpoint...`,
              );
              const result = await uploadInlineImage(
                imageDoc,
                siteNoteId,
                user.id,
              );
              console.log(
                `Image "${image.name}" uploaded successfully with ID:`,
                result.id,
              );

              return { success: true, name: image.name };
            } catch (imageError) {
              console.error("Error uploading pasted image:", imageError);
              return {
                success: false,
                name: image.name,
                error: imageError.message,
              };
            }
          });

          // Wait for all image uploads to complete
          const results = await Promise.all(imageUploadPromises);

          // Check for failures
          const failedUploads = results.filter((r) => !r.success);
          if (failedUploads.length > 0) {
            console.warn(
              `${failedUploads.length} image(s) failed to upload:`,
              failedUploads,
            );
            toast.error(`${failedUploads.length} image(s) failed to upload`);
          }

          const successfulUploads = results.filter((r) => r.success);
          if (successfulUploads.length > 0) {
            toast.success(
              `${successfulUploads.length} image(s) uploaded successfully`,
            );
          }
        }

        // After successfully saving the note and uploading documents/images
        await handleAddPriority(siteNoteId, user.id);

        // Construct the full note object for UI updates
        const newNoteObject = {
          id: siteNoteId,
          note: noteHtmlContent,
          date: selectedDate,
          timeStamp: new Date().toISOString(),
          jobId: selectedJob,
          job: selectedJobData?.name || selectedJob,
          projectId: selectedProject,
          project: selectedProjectData?.name || selectedProject,
          workspaceId: selectedWorkspace,
          workspace: userworksaces.find(
            (w) => w.id.toString() === selectedWorkspace,
          )?.name,
          userName: user.name || user.username,
          userId: user.id,
          documentCount: documents.length,
          inlineImageCount: pastedImages.length,
        };

        // INTELLIGENT REFRESH BASED ON VIEW MODE
        if (viewMode === "stacked" && refreshStackedView) {
          // Use the specialized stacked view refresh
          await refreshStackedView(newNoteObject);
        } else if (hasActiveFilters && fetchNotesWithFilters) {
          // If filters are active, refresh filtered notes
          await fetchNotesWithFilters(selectedFilters);
        } else if (hasActiveSearchText) {
          // If filters are active, refresh filtered notes
          await performSearching(searchTerm);
        }
         else {
          // Otherwise, use normal refresh
          await refreshNotes();
        }

        onClose();
        toast.success("Note saved successfully!");
      } catch (error) {
        console.error("Save error:", error);
        setApiError(error.message || "Failed to save note");
        toast.error("Failed to save note");
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
          handleSaveJournal();
        }
      },
      [isSaving, handleSaveJournal, isReadOnly],
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

    // Document handling functions
    const handleAddDocument = () => {
      if (isReadOnly) return; // Disable if read-only

      setCurrentDocumentBeingEdited(null);
      setNewDocument({ name: "", file: null });
      setErrors({});
      setShowDocumentModal(true);
    };

    const handleEditDocument = (doc) => {
      if (isReadOnly) return; // Disable if read-only

      setCurrentDocumentBeingEdited(doc);
      setNewDocument({ name: doc.name, file: null });
      setErrors({});
      setShowDocumentModal(true);
    };

    const handleDeleteDocument = (indexToDelete) => {
      if (isReadOnly) return; // Disable if read-only

      if (
        window.confirm(
          "Are you sure you want to remove this document from the list? It will not be saved.",
        )
      ) {
        setDocuments((prev) => prev.filter((_, i) => i !== indexToDelete));
      }
    };

    const isValidFileType = (file) => {
      return Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
    };

    const handleDocumentFileChange = (e) => {
      if (isReadOnly) return; // Disable if read-only

      const file = e.target.files[0];
      setError("");

      if (!isValidFileType(file)) {
        setError("Invalid file type!");
        return;
      }

      setNewDocument((prev) => ({ ...prev, file }));
    };

    const handleDocumentSubmit = () => {
      if (isReadOnly) return; // Disable if read-only

      const newDocErrors = {};
      if (!newDocument.name.trim()) {
        setError("Document name is required.");
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
        fileName:
          newDocument.file?.name ||
          currentDocumentBeingEdited?.fileName ||
          "N/A",
      };

      if (currentDocumentBeingEdited) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === currentDocumentBeingEdited.id
              ? { ...doc, ...docToStage }
              : doc,
          ),
        );
      } else {
        setDocuments((prev) => [...prev, docToStage]);
      }

      setShowDocumentModal(false);
      setNewDocument({ name: "", file: null });
      setCurrentDocumentBeingEdited(null);
      setErrors({});
    };

    const handleAddPriority = async (noteId, userId) => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/Priority/AddPriority`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              noteID: noteId,
              priorityValue: selectedPriority,
              userId: userId,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to save priority");
        }
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    };
    const handlePriorityClick = () => {
      if (isReadOnly) return;

      // Cycle through priority levels: 1 → 3 → 4 → 5 → 1
      let nextPriority;
      if (selectedPriority === "1") {
        nextPriority = "3"; // Medium
      } else if (selectedPriority === "3") {
        nextPriority = "4"; // High
      } else if (selectedPriority === "4") {
        nextPriority = "5"; // Completed
      } else {
        nextPriority = "1"; // No priority
      }

      setSelectedPriority(nextPriority);

      // Update toast message for completed priority
      let priorityText;
      if (nextPriority === "5") {
        priorityText = "Completed";
      } else if (nextPriority === "4") {
        priorityText = "High";
      } else if (nextPriority === "3") {
        priorityText = "Medium";
      } else {
        priorityText = "No Priority";
      }

      toast.success(`Priority set to ${priorityText}`);
    };

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
              disabled={isReadOnly} // Disable if read-only
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

    // Editor toolbar component - UPDATED with emoji picker
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

          <div
            className="documents-button-wrapper"
            style={{ position: "relative" }}
          >
            <button
              onClick={() => setActiveTab("documents")}
              title={`${documents.length} document${documents.length !== 1 ? "s" : ""} attached`}
              className={`documents-button ${activeTab === "documents" ? "active" : ""} ${isReadOnly ? "disabled" : ""}`}
              disabled={isReadOnly}
            >
              <i className="fas fa-paperclip"></i>
              {documents.length > 0 && (
                <span className="documents-badge">{documents.length}</span>
              )}
            </button>
          </div>

          <div className="priority-flag-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePriorityClick();
              }}
              title={`${
                selectedPriority === "1"
                  ? "No Priority - Click to set"
                  : selectedPriority === "3"
                    ? "Medium Priority - Click to change"
                    : selectedPriority === "4"
                      ? "High Priority - Click to change"
                      : selectedPriority === "5"
                        ? "Priority Level 5 (Green) - Click to change"
                        : "Click to set priority"
              }`}
              className={`priority-flag-button priority-${selectedPriority} ${selectedPriority > 1 ? "has-priority" : ""} ${isReadOnly ? "disabled" : ""}`}
              disabled={isReadOnly}
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

    // Editor content component - ONLY RICH TEXT EDITOR
    const renderEditorContent = () => {
      return (
        <div className="editor-content-container">
          <div className="form-group">
            <label>
              Note{" "}
              {errors.note && (
                <span className="error-message-inline">{errors.note}</span>
              )}
            </label>

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
                  : "Type your note here and paste images."
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
                {pastedImages.length !== 1 ? "s" : ""} attached (will be saved
                separately)
              </div>
            )}
          </div>
        </div>
      );
    };

    // Tab content components
    const renderJournalTab = () => {
      const projectOptions = getProjectOptions();
      const jobOptions = getJobOptions();

      return (
        <div className="journal-section">
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
              Date{" "}
              {errors.date && (
                <span className="error-message-inline">{errors.date}</span>
              )}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              disabled={isReadOnly}
            />
          </div>

          {renderEditorContent()}
        </div>
      );
    };

    const renderDocumentsTab = () => (
      <div className="documents-section">
        <h3>Attached Documents</h3>
        {!isReadOnly && (
          <div className="document-actions">
            <button className="add-button" onClick={handleAddDocument}>
              Add Document
            </button>
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
                  {!isReadOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.id || index}>
                    <td>{doc.name}</td>
                    <td>{doc.fileName || "N/A"}</td>
                    {!isReadOnly && (
                      <td className="document-actions-cell">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(index)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </td>
                    )}
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
          <label>
            Priority{" "}
            {errors.priority && (
              <span className="error-message-inline">{errors.priority}</span>
            )}
          </label>

          <div className="priority-visual-selector">
            <div
              className={`priority-option ${selectedPriority === "4" ? "selected" : ""} priority-high`}
              onClick={() => !isReadOnly && setSelectedPriority("4")}
              title="High Priority"
              style={{ cursor: isReadOnly ? "not-allowed" : "pointer" }}
            >
              <div className="priority-dot"></div>
              <span>High</span>
            </div>

            <div
              className={`priority-option ${selectedPriority === "3" ? "selected" : ""} priority-medium`}
              onClick={() => !isReadOnly && setSelectedPriority("3")}
              title="Medium Priority"
              style={{ cursor: isReadOnly ? "not-allowed" : "pointer" }}
            >
              <div className="priority-dot"></div>
              <span>Medium</span>
            </div>

            <div
              className={`priority-option ${selectedPriority === "1" ? "selected" : ""} priority-none`}
              onClick={() => !isReadOnly && setSelectedPriority("1")}
              title="No Priority"
              style={{ cursor: isReadOnly ? "not-allowed" : "pointer" }}
            >
              <div className="priority-dot"></div>
              <span>No Priority</span>
            </div>
          </div>

          <div className="priority-description">
            {selectedPriority === "4" && (
              <span style={{ color: "#dc3545" }}>
                <i className="fas fa-exclamation-circle"></i> High priority -
                Needs immediate attention
              </span>
            )}
            {selectedPriority === "3" && (
              <span style={{ color: "#ffc107" }}>
                <i className="fas fa-exclamation-triangle"></i> Medium priority
                - Important but not urgent
              </span>
            )}
            {selectedPriority === "1" && (
              <span style={{ color: "#6c757d" }}>
                <i className="fas fa-info-circle"></i> No priority - Standard
                note
              </span>
            )}
          </div>
        </div>
      </div>
    );

    const renderTabContent = () => {
      switch (activeTab) {
        case "journal":
          return renderJournalTab();
        case "documents":
          return renderDocumentsTab();
        case "priority":
          return renderPriorityTab();
        default:
          return renderJournalTab();
      }
    };

    return (
      <div className="edit-note-modal-overlay">
        <div className="edit-note-modal" ref={modalRef}>
          <div className="modal-header">
            <h2>
              New Note{" "}
              {isReadOnly && (
                <span
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginLeft: "10px",
                  }}
                >
                  (Read-Only)
                </span>
              )}
            </h2>
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

          <div className="tabs">
            <button
              className={`tab-button ${activeTab === "journal" ? "active" : ""} ${isReadOnly ? "read-only-tab" : ""}`}
              onClick={() => setActiveTab("journal")}
              disabled={isReadOnly}
            >
              Journal
            </button>
          </div>

          <div className="tab-content">{renderTabContent()}</div>

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
                onClick={handleSaveJournal}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>

          {/* Document Modal */}
          {showDocumentModal && !isReadOnly && (
            <div className="document-modal-overlay">
              <div className="document-modal">
                <div className="modal-header">
                  <h3>
                    {currentDocumentBeingEdited
                      ? "Edit Document"
                      : "Add Document"}
                  </h3>
                  <button
                    className="close-button"
                    onClick={() => setShowDocumentModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="form-group">
                  <label>Document Name:</label>
                  {errors.newDocumentName && (
                    <span className="error-message-inline">
                      {errors.newDocumentName}
                    </span>
                  )}
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) =>
                      setNewDocument((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>File:</label>
                  {errors.newDocumentFile && (
                    <span className="error-message-inline">
                      {errors.newDocumentFile}
                    </span>
                  )}
                  <input
                    type="file"
                    onChange={handleDocumentFileChange}
                    required={!currentDocumentBeingEdited}
                  />
                  {currentDocumentBeingEdited?.fileName &&
                    !newDocument.file && (
                      <p>Current file: {currentDocumentBeingEdited.fileName}</p>
                    )}
                  {newDocument.file && (
                    <p>Selected file: {newDocument.file.name}</p>
                  )}
                  {error && <p className="file-error">{error}</p>}
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setShowDocumentModal(false);
                      setCurrentDocumentBeingEdited(null);
                      setNewDocument({ name: "", file: null });
                      setErrors({});
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocumentSubmit}
                    className="submit-button"
                    disabled={
                      !newDocument.name.trim() ||
                      (!newDocument.file &&
                        !currentDocumentBeingEdited?.fileName)
                    }
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
  },
);

NewNoteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  refreshNotes: PropTypes.func.isRequired,
  addSiteNote: PropTypes.func.isRequired,
  onUploadDocument: PropTypes.func.isRequired,
  onDeleteDocument: PropTypes.func,
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      projectName: PropTypes.string,
      workspaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ),
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      jobName: PropTypes.string,
      projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ),
  prefilledData: PropTypes.shape({
    project: PropTypes.string,
    job: PropTypes.string,
    workspace: PropTypes.string,
    date: PropTypes.string,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    workspaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  defWorkSpaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
};

NewNoteModal.defaultProps = {
  projects: [],
  jobs: [],
  prefilledData: null,
  defWorkSpaceId: null,
  userworksaces: [],
  source: "dashboard",
  defaultWorkspaceRole: null,
  fetchNotesWithFilters: null,
  selectedFilters: {},
  hasActiveFilters: false,
  viewMode: "cards",
  refreshStackedView: null,
};

export default NewNoteModal;
