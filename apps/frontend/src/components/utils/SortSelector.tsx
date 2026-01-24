import React from "react";
import { ArrowUpDown } from "lucide-react";

export interface SortOption {
  value: string;
  label: string;
}

export interface SortSelectorProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const SortSelector: React.FC<SortSelectorProps> = ({
  options,
  value,
  onChange,
  label = "Sort by",
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowUpDown size={16} className="text-secondary" />
      <label className="text-sm text-secondary">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
