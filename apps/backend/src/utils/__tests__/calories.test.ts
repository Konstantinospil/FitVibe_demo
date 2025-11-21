import { estimateEntryCalories } from "../calories";

describe("estimateEntryCalories", () => {
  it("estimates calories using duration-based MET formula", () => {
    const calories = estimateEntryCalories({ actual_duration_s: 600 }, { weight_kg: 80 });

    expect(calories).toBeCloseTo(84, 1);
  });

  it("falls back to reps/load calculation when duration is missing", () => {
    const calories = estimateEntryCalories(
      { actual_sets: 3, actual_total_reps: 36, actual_avg_load_kg: 40 },
      { weight_kg: 72 },
    );

    expect(calories).toBeCloseTo(34.4, 1);
  });

  it("uses weight-derived load when avg load is missing", () => {
    const calories = estimateEntryCalories(
      { actual_sets: 4, actual_total_reps: 20 },
      { weight_kg: 90 },
    );

    const derivedLoad = 90 * 0.3;
    const expected = Math.round(((20 * derivedLoad * 0.1) / 4.184) * 10) / 10;
    expect(calories).toBe(expected);
  });

  it("never returns negative calories", () => {
    const calories = estimateEntryCalories({ actual_duration_s: -100 }, { weight_kg: 70 });

    expect(calories).toBe(0);
  });
});
