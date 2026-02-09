export const PAGE_SIZE = 25;
export const INITIAL_PAGE_NUMBER = 1;
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Updated priority values based on your changes
export const PRIORITY_VALUES = {
  NONE: 1,
  HIGH: 3,      
  MEDIUM: 4,   
  COMPLETED: 5,
};

export const PRIORITY_LABELS = {
  [PRIORITY_VALUES.NONE]: "No priority",
  [PRIORITY_VALUES.HIGH]: "High",
  [PRIORITY_VALUES.MEDIUM]: "Medium",
  [PRIORITY_VALUES.COMPLETED]: "Completed",
};

export const PRIORITY_COLORS = {
  [PRIORITY_VALUES.NONE]: "#ccc",
  [PRIORITY_VALUES.HIGH]: "#ef5350",    // Red for High
  [PRIORITY_VALUES.MEDIUM]: "#e8f628",  // Yellow for Medium
  [PRIORITY_VALUES.COMPLETED]: "#28a745", // Green for Completed
};