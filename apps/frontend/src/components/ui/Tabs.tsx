import React, { createContext, useContext, useState } from "react";

interface TabsContextValue {
<<<<<<< Updated upstream
  value: string;
  onValueChange: (value: string) => void;
=======
  activeTab: string;
  setActiveTab: (value: string) => void;
>>>>>>> Stashed changes
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

<<<<<<< Updated upstream
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component");
  }
  return context;
};

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Tabs container component (WCAG 2.2 AA).
 * Manages tab state and provides context to child components.
 */
export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange: controlledOnValueChange,
  children,
  className,
  style,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    controlledOnValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
=======
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const tabsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-sm)",
  borderBottom: "1px solid var(--color-border)",
  marginBottom: "var(--space-md)",
};

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
  style,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = controlledValue ?? internalValue;

  const setActiveTab = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div
        className={className}
        style={{
          ...tabsStyle,
          ...style,
        }}
        role="tablist"
        {...props}
>>>>>>> Stashed changes
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

<<<<<<< Updated upstream
/**
 * TabsList component - container for tab triggers.
 */
export const TabsList: React.FC<TabsListProps> = ({ children, className, style, ...rest }) => {
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: "flex",
        gap: "var(--space-xs)",
        borderBottom: "1px solid var(--color-border)",
        ...style,
      }}
      {...rest}
=======
export const TabsList: React.FC<TabsListProps> = ({ children, className, style, ...props }) => {
  return (
    <div
      className={className}
      style={{
        ...listStyle,
        ...style,
      }}
      role="tablist"
      {...props}
>>>>>>> Stashed changes
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

<<<<<<< Updated upstream
/**
 * TabsTrigger component - individual tab button.
 */
=======
const triggerBaseStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: "var(--font-size-md)",
  transition: "color 150ms ease, border-color 150ms ease",
  position: "relative",
  bottom: "-1px",
};

const triggerActiveStyle: React.CSSProperties = {
  color: "var(--color-text-primary)",
  borderBottomColor: "var(--color-primary)",
};

>>>>>>> Stashed changes
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
  style,
<<<<<<< Updated upstream
  onClick,
  ...rest
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onValueChange(value);
    onClick?.(e);
=======
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  const handleClick = () => {
    setActiveTab(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveTab(value);
    }
>>>>>>> Stashed changes
  };

  return (
    <button
<<<<<<< Updated upstream
      role="tab"
      aria-selected={isSelected}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      type="button"
      className={className}
      style={{
        padding: "var(--space-md) var(--space-lg)",
        background: "none",
        border: "none",
        borderBottom: isSelected ? "2px solid var(--color-primary)" : "2px solid transparent",
        color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)",
        fontWeight: isSelected ? 600 : 400,
        fontSize: "var(--font-size-sm)",
        cursor: "pointer",
        transition: "color 150ms ease, border-color 150ms ease",
        ...style,
      }}
      onClick={handleClick}
      {...rest}
=======
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      className={className}
      style={{
        ...triggerBaseStyle,
        ...(isActive ? triggerActiveStyle : {}),
        ...style,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
>>>>>>> Stashed changes
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

<<<<<<< Updated upstream
/**
 * TabsContent component - content panel for a tab.
 */
=======
>>>>>>> Stashed changes
export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
  style,
<<<<<<< Updated upstream
  ...rest
}) => {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;

  if (!isSelected) {
=======
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within Tabs");
  }

  const { activeTab } = context;
  const isActive = activeTab === value;

  if (!isActive) {
>>>>>>> Stashed changes
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
      style={{
<<<<<<< Updated upstream
        padding: "var(--space-lg)",
        ...style,
      }}
      {...rest}
=======
        ...style,
      }}
      {...props}
>>>>>>> Stashed changes
    >
      {children}
    </div>
  );
};
