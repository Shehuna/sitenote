import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

const TooltipPortal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

TooltipPortal.propTypes = {
  children: PropTypes.node.isRequired,
};

export default TooltipPortal;