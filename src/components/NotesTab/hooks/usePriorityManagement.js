import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { API_BASE_URL, PRIORITY_VALUES, PRIORITY_LABELS, PRIORITY_COLORS } from "../utils/constants";

export const usePriorityManagement = () => {
  const [priorityTooltipData, setPriorityTooltipData] = useState({});
  const [loadingPriorityData, setLoadingPriorityData] = useState({});
  const [manuallyUpdatedPriorities, setManuallyUpdatedPriorities] = useState({});

  const fetchPriorityData = useCallback(async (noteId) => {
    if (!noteId || priorityTooltipData[noteId]) return;

    try {
      setLoadingPriorityData((prev) => ({ ...prev, [noteId]: true }));
      
      const response = await fetch(
        `${API_BASE_URL}/api/Priority/GetPriorityByNoteId/${noteId}`,
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.priority) {
          const priorityValue = data.priority.priorityValue;
          
          setPriorityTooltipData((prev) => ({
            ...prev,
            [noteId]: {
              priorityValue,
              priorityText: PRIORITY_LABELS[priorityValue] || "No priority",
              userName:
                data.priority.userName || data.priority.name || "Unknown",
              createdAt: data.priority.createdAt,
              updatedAt: data.priority.updatedAt,
              hasPriority: priorityValue > 1,
            },
          }));
        } else {
          setPriorityTooltipData((prev) => ({
            ...prev,
            [noteId]: {
              priorityValue: 1,
              priorityText: "No priority",
              userName: "",
              createdAt: "",
              updatedAt: "",
              hasPriority: false,
            },
          }));
        }
      } else {
        setPriorityTooltipData((prev) => ({
          ...prev,
          [noteId]: {
            priorityValue: 1,
            priorityText: "No priority",
            userName: "",
            createdAt: "",
            updatedAt: "",
            hasPriority: false,
          },
        }));
      }
    } catch (error) {
      console.error(`Error fetching priority data for note ${noteId}:`, error);
      setPriorityTooltipData((prev) => ({
        ...prev,
        [noteId]: {
          priorityValue: 1,
          priorityText: "No priority",
          userName: "",
          createdAt: "",
          updatedAt: "",
          hasPriority: false,
          error: true,
        },
      }));
    } finally {
      setLoadingPriorityData((prev) => ({ ...prev, [noteId]: false }));
    }
  }, [priorityTooltipData]);

  const updateNotePriority = useCallback(async (noteId, priorityValue) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        throw new Error("User not found");
      }

      console.log(`API: Updating note ${noteId} to priority ${priorityValue}`);

      const checkResponse = await fetch(
        `${API_BASE_URL}/api/Priority/GetPriorityByNoteId/${noteId}`,
      );

      let priorityId = null;
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        console.log("Priority check response:", data);
        if (data.priority || (Array.isArray(data) && data.length > 0)) {
          priorityId =
            data.priority?.id || (Array.isArray(data) ? data[0]?.id : null);
        }
      }

      console.log(`Found priorityId: ${priorityId} for note ${noteId}`);

      // Determine priority text
      let priorityText = "";
      switch (priorityValue) {
        case PRIORITY_VALUES.HIGH:
          priorityText = "High";
          break;
        case PRIORITY_VALUES.MEDIUM:
          priorityText = "Medium";
          break;
        case PRIORITY_VALUES.COMPLETED:
          priorityText = "Completed";
          break;
        default:
          priorityText = "No priority";
      }

      if (priorityId) {
        const response = await fetch(
          `${API_BASE_URL}/api/Priority/UpdatePriority/${priorityId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priorityValue: priorityValue,
              userId: user.id,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Update priority error:", errorText);
          throw new Error("Failed to update priority");
        }

        const result = await response.json();
        console.log("Update priority result:", result);
      } else if (priorityValue > 1) {
        const response = await fetch(
          `${API_BASE_URL}/api/Priority/AddPriority`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priorityValue: priorityValue,
              userId: user.id,
              noteId: noteId,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Add priority error:", errorText);
          throw new Error("Failed to add priority");
        }

        const result = await response.json();
        console.log("Add priority result:", result);
        toast.success(
          `Priority set to ${priorityValue === PRIORITY_VALUES.MEDIUM ? "Medium" : "High"}`,
        );
      } else {
        console.log("No priority exists and setting to 1, no API call needed");
        toast.success("Priority reset to default");
      }

      // Update priority in all local states
      setManuallyUpdatedPriorities((prev) => ({
        ...prev,
        [noteId]: priorityValue,
      }));

      // ALSO update the priorityTooltipData state immediately
      setPriorityTooltipData((prev) => ({
        ...prev,
        [noteId]: {
          priorityValue: priorityValue,
          priorityText: priorityText,
          userName: user.name || user.userName || "Current User",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hasPriority: priorityValue > 1,
        },
      }));

    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority: " + error.message);

      setManuallyUpdatedPriorities((prev) => {
        const newState = { ...prev };
        delete newState[noteId];
        return newState;
      });
    }
  }, []);

  const handlePriorityClick = useCallback((note, e) => {
    e.stopPropagation();
    e.preventDefault();

    const currentPriority = note.priority || 1;
    let nextPriority;

    console.log(`Current priority for note ${note.id}: ${currentPriority}`);

    if (currentPriority === 1) {
      nextPriority = PRIORITY_VALUES.HIGH; // 3
    } else if (currentPriority === PRIORITY_VALUES.HIGH) {
      nextPriority = PRIORITY_VALUES.MEDIUM; // 4
    } else if (currentPriority === PRIORITY_VALUES.MEDIUM) {
      nextPriority = PRIORITY_VALUES.COMPLETED; // 5
    } else {
      nextPriority = 1;
    }

    console.log(`Next priority for note ${note.id}: ${nextPriority}`);

    updateNotePriority(note.id, nextPriority);
  }, [updateNotePriority]);

  const getPriorityValue = useCallback((note) => {
    return manuallyUpdatedPriorities[note.id] !== undefined
      ? manuallyUpdatedPriorities[note.id]
      : note.priority || 1;
  }, [manuallyUpdatedPriorities]);

  return {
    priorityTooltipData,
    loadingPriorityData,
    manuallyUpdatedPriorities,
    fetchPriorityData,
    updateNotePriority,
    handlePriorityClick,
    getPriorityValue,
    setManuallyUpdatedPriorities,
    setPriorityTooltipData,
  };
};