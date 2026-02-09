import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../utils/constants";

export const useUserStatus = () => {
  const [userStatusMap, setUserStatusMap] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});

  const fetchUserStatus = useCallback(async (userId) => {
    if (!userId || userStatusMap[userId]) return;

    try {
      setLoadingUsers((prev) => ({ ...prev, [userId]: true }));
      const response = await fetch(
        `${API_BASE_URL}/api/UserManagement/GetUserById/${userId}`,
      );
      
      if (response.ok) {
        const data = await response.json();
        setUserStatusMap((prev) => ({
          ...prev,
          [userId]: {
            active: data.user?.status === 1,
            name:
              `${data.user?.fname} ${data.user?.lname}`.trim() ||
              data.user?.userName ||
              "Unknown",
          },
        }));
      }
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  }, [userStatusMap]);

  const getUserStatusStyle = useCallback((userId) => {
    if (userId && userStatusMap[userId] && !userStatusMap[userId].active) {
      return {
        color: "#95a5a6",
        fontStyle: "italic",
        opacity: 0.7,
      };
    }
    return {};
  }, [userStatusMap]);

  const getUserStatusInfo = useCallback((userId) => {
    if (!userId || !userStatusMap[userId]) {
      return { active: true, name: "Loading..." };
    }
    return userStatusMap[userId];
  }, [userStatusMap]);

  return {
    userStatusMap,
    loadingUsers,
    fetchUserStatus,
    getUserStatusStyle,
    getUserStatusInfo,
  };
};