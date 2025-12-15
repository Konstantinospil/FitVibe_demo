import React, { createContext, useContext, useState } from "react";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

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
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

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
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

/**
 * TabsTrigger component - individual tab button.
 */
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
  style,
  onClick,
  ...rest
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onValueChange(value);
    onClick?.(e);
  };

  return (
    <button
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
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

/**
 * TabsContent component - content panel for a tab.
 */
export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
  style,
  ...rest
}) => {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
      style={{
        padding: "var(--space-lg)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
