import { describe, it, expect } from "@jest/globals";
import {
  estimateEntryCalories,
  type ExerciseEntryMetrics,
  type AthleteProfileMetrics,
} from "../../../apps/backend/src/utils/calories.js";

describe("calories", () => {
  describe("estimateEntryCalories", () => {
    describe("duration-based calculation", () => {
      it("should calculate calories based on duration", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 1800, // 30 minutes
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Formula: ((met * 3.5 * weight) / 200) * mins
        // ((6 * 3.5 * 70) / 200) * 30 = (1470 / 200) * 30 = 7.35 * 30 = 220.5
        // Rounded: 220.5
        expect(result).toBe(220.5);
      });

      it("should use default weight of 70kg when weight is not provided", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 3600, // 60 minutes
        };
        const profile: AthleteProfileMetrics = {};

        const result = estimateEntryCalories(entry, profile);

        // Should use weight = 70
        expect(result).toBeGreaterThan(0);
        expect(result).toBe(441); // ((6 * 3.5 * 70) / 200) * 60 = 441
      });

      it("should handle weight as null", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 1800,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: null,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should use default weight of 70
        expect(result).toBe(220.5);
      });

      it("should handle weight as undefined", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 1800,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: undefined,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should use default weight of 70
        expect(result).toBe(220.5);
      });

      it("should calculate for different weights", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 1800, // 30 minutes
        };
        const profile80: AthleteProfileMetrics = { weight_kg: 80 };
        const profile60: AthleteProfileMetrics = { weight_kg: 60 };

        const result80 = estimateEntryCalories(entry, profile80);
        const result60 = estimateEntryCalories(entry, profile60);

        // Heavier person should burn more calories
        expect(result80).toBeGreaterThan(result60);
        expect(result80).toBe(252); // ((6 * 3.5 * 80) / 200) * 30 = 252
        expect(result60).toBe(189); // ((6 * 3.5 * 60) / 200) * 30 = 189
      });

      it("should handle zero duration", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 0,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should round to one decimal place", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 100, // ~1.67 minutes
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should be rounded to 1 decimal place
        const decimalPlaces = (result.toString().split(".")[1] || "").length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      });
    });

    describe("reps and sets-based calculation", () => {
      it("should calculate calories based on reps and sets when duration is not provided", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 30,
          actual_avg_load_kg: 50,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Formula: (reps * load * 0.1) / 4.184
        // (30 * 50 * 0.1) / 4.184 = 150 / 4.184 = 35.85...
        // Rounded: 35.9
        expect(result).toBeGreaterThan(0);
        expect(result).toBeCloseTo(35.9, 1);
      });

      it("should use default load when avg_load_kg is not provided", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 30,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Default load = weight * 0.3 = 70 * 0.3 = 21
        // (30 * 21 * 0.1) / 4.184 = 63 / 4.184 = 15.05...
        expect(result).toBeGreaterThan(0);
        expect(result).toBeCloseTo(15.1, 1);
      });

      it("should use default load when avg_load_kg is null", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 30,
          actual_avg_load_kg: null,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should use default load = weight * 0.3
        expect(result).toBeGreaterThan(0);
        expect(result).toBeCloseTo(15.1, 1);
      });

      it("should use default load when avg_load_kg is undefined", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 30,
          actual_avg_load_kg: undefined,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should use default load = weight * 0.3
        expect(result).toBeGreaterThan(0);
        expect(result).toBeCloseTo(15.1, 1);
      });

      it("should prioritize duration over reps/sets", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 1800,
          actual_sets: 3,
          actual_total_reps: 30,
          actual_avg_load_kg: 50,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Should use duration calculation, not reps/sets
        expect(result).toBe(220.5); // Duration-based result
      });

      it("should handle zero reps", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 0,
          actual_avg_load_kg: 50,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should handle zero load", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
          actual_total_reps: 30,
          actual_avg_load_kg: 0,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });
    });

    describe("edge cases", () => {
      it("should return 0 when no metrics are provided", () => {
        const entry: ExerciseEntryMetrics = {};
        const profile: AthleteProfileMetrics = {};

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should return 0 when duration is null", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: null,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should return 0 when duration is undefined", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: undefined,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should return 0 when sets are provided but reps are not", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 3,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should return 0 when reps are provided but sets are not", () => {
        const entry: ExerciseEntryMetrics = {
          actual_total_reps: 30,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBe(0);
      });

      it("should never return negative values", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: -100, // Negative duration
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        // Math.max(0, kcal) should ensure non-negative
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle very large duration values", () => {
        const entry: ExerciseEntryMetrics = {
          actual_duration_s: 86400, // 24 hours
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBeGreaterThan(0);
        expect(result).toBe(10584); // ((6 * 3.5 * 70) / 200) * 1440 = 10584
      });

      it("should handle very large rep counts", () => {
        const entry: ExerciseEntryMetrics = {
          actual_sets: 10,
          actual_total_reps: 1000,
          actual_avg_load_kg: 50,
        };
        const profile: AthleteProfileMetrics = {
          weight_kg: 70,
        };

        const result = estimateEntryCalories(entry, profile);

        expect(result).toBeGreaterThan(0);
        expect(result).toBeCloseTo(1195.0, 0); // (1000 * 50 * 0.1) / 4.184 = 1195.028..., rounded to 1 decimal = 1195.0
      });
    });
  });
});
