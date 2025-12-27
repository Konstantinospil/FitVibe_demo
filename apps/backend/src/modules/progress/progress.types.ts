export interface ProgressSummary {
  period: number;
  sessions_completed: number;
  total_reps: number;
  total_volume: number;
  total_duration_min: number;
  avg_volume_per_session: number;
}

export type TrendGroupBy = "day" | "week";

export interface TrendPoint {
  date: string;
  sessions: number;
  volume: number;
}

export interface ExerciseBreakdown {
  type_code: string;
  sessions: number;
  total_reps: number;
  total_volume: number;
  total_duration_min: number;
}

export interface PlanProgress {
  id: string;
  name: string;
  progress_percent: number;
  session_count: number;
  completed_count: number;
}

export interface TrendsPayload {
  period: number;
  group_by: TrendGroupBy;
  data: TrendPoint[];
}

export interface ExercisesPayload {
  period: number;
  data: ExerciseBreakdown[];
}

export interface ProgressReport {
  generated_at: string;
  period: number;
  group_by: TrendGroupBy;
  summary: ProgressSummary;
  trends: TrendPoint[];
  exercises: ExerciseBreakdown[];
  plans: PlanProgress[];
}

export interface VibeTrendPoint {
  month: string;
  points: number;
}

export interface VibePointsSeries {
  type_code: string;
  points: number;
  trend: VibeTrendPoint[];
}

export interface VibePointsPayload {
  period_months: number;
  months: string[];
  overall: {
    points: number;
    trend: VibeTrendPoint[];
  };
  vibes: VibePointsSeries[];
}
