import React from "react";

export interface ScreenReaderOnlyProps {
  children: React.ReactNode;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ children }) => {
  return (
    <span
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
      aria-hidden="false"
    >
      {children}
    </span>
  );
};
