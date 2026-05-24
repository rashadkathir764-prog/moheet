import React from 'react';

// Simple wrapper - no animation to avoid flicker with React Router
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
