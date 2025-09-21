// src/context/ProgressContext.jsx
import { createContext, useState, useContext } from "react";

const ProgressContext = createContext();

export function AuthProvider({ children }) {
  const [progress, setProgress] = useState({}); // { lessonId: percentage }

  const updateProgress = (lessonId, percentage) => {
    setProgress((prev) => ({ ...prev, [lessonId]: percentage }));
  };

  return (
    <ProgressContext.Provider value={{ progress, updateProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
