import React from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  filters: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }>;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="flex flex-col gap-1">
          <label className="text-sm text-secondary">{filter.label}</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="form-input"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
