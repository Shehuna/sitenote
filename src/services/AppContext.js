import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [data, setData] = useState({
    value1: 'Initial Value 1',
    value2: 'Initial Value 2'
  });

  const updateValues = (newValue1, newValue2) => {
    setData({
      value1: newValue1,
      value2: newValue2
    });
  };

  return (
    <AppContext.Provider value={{ data, updateValues }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};