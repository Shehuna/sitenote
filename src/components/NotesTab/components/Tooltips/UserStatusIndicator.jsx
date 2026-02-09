import React from "react";
import PropTypes from "prop-types";

const UserStatusIndicator = ({
  userId,
  userName,
  userStatusMap,
  loadingUsers,
}) => {
  const isInactive = userStatusMap[userId] && !userStatusMap[userId].active;
  const isLoading = loadingUsers[userId];

  if (isLoading) {
    return (
      <span className="user-status-loading" title="Loading user status...">
        {userName || "Unknown"}
        <i
          className="fas fa-spinner fa-spin"
          style={{ marginLeft: "4px", fontSize: "10px" }}
        />
      </span>
    );
  }

  if (isInactive) {
    return (
      <span
        className="inactive-user-wrapper"
        style={{ position: "relative", display: "inline-block" }}
      >
        <span style={{ color: "#95a5a6", fontStyle: "italic", opacity: 0.7 }}>
          {userName || "Unknown"}
        </span>
        <div
          className="inactive-user-tooltip"
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#333",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            zIndex: 1000,
            opacity: 0,
            visibility: "hidden",
            transition: "opacity 0.2s, visibility 0.2s",
            marginBottom: "5px",
          }}
        >
          Inactive User
        </div>
      </span>
    );
  }

  return <span>{userName || "Unknown"}</span>;
};

UserStatusIndicator.propTypes = {
  userId: PropTypes.number,
  userName: PropTypes.string,
  userStatusMap: PropTypes.object.isRequired,
  loadingUsers: PropTypes.object.isRequired,
};

UserStatusIndicator.defaultProps = {
  userId: null,
  userName: "",
};

export default UserStatusIndicator;