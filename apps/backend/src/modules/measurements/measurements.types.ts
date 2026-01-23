export type MeasurementSystem = "metric" | "imperial";
export type MeasurementUnitType =
  | "length"
  | "weight"
  | "volume"
  | "ratio"
  | "count"
  | "time"
  | "power"
  | "percentage";

export type DerivedOperator = "ratio";

export interface MeasurementAttribute {
  id: string;
  key: string;
  normalizedKey: string;
  label: string;
  description: string | null;
  unitType: MeasurementUnitType;
  granularity: string;
  measurementSystem: MeasurementSystem;
  minValueMetric: number | null;
  maxValueMetric: number | null;
  minValueImperial: number | null;
  maxValueImperial: number | null;
  isDefault: boolean;
  derivedFromAId: string | null;
  derivedFromBId: string | null;
  derivedOperator: DerivedOperator | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementValue {
  attributeId: string;
  valueNumber: number;
  measuredAt: string;
}

export interface MeasurementAttributeWithLatestValue extends MeasurementAttribute {
  latestValue: MeasurementValue | null;
  isVisible: boolean;
}

export interface MeasurementAttributeCreateInput {
  key?: string;
  label: string;
  description?: string | null;
  unitType: MeasurementUnitType;
  granularity: string;
  measurementSystem: MeasurementSystem;
  minValue?: number | null;
  maxValue?: number | null;
  derivedFromAId?: string | null;
  derivedFromBId?: string | null;
  derivedOperator?: DerivedOperator | null;
}
