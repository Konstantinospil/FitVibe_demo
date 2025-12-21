import { toPoints } from "../../../apps/backend/src/utils/points.js";

describe("points utilities", () => {
  describe("toPoints", () => {
    it("should calculate points with both calories and subjectiveDay", () => {
      const result = toPoints({ calories: 500, subjectiveDay: 8 });

      // Formula: (calories * 0.1 + subjectiveDay * 2) * 10 / 10
      // (500 * 0.1 + 8 * 2) = (50 + 16) = 66
      expect(result).toBe(66);
    });

    it("should use default subjectiveDay of 5 when not provided", () => {
      const result = toPoints({ calories: 300 });

      // Formula: (300 * 0.1 + 5 * 2) = (30 + 10) = 40
      expect(result).toBe(40);
    });

    it("should use default calories of 0 when not provided", () => {
      const result = toPoints({ subjectiveDay: 7 });

      // Formula: (0 * 0.1 + 7 * 2) = (0 + 14) = 14
      expect(result).toBe(14);
    });

    it("should use defaults for both when neither is provided", () => {
      const result = toPoints({});

      // Formula: (0 * 0.1 + 5 * 2) = (0 + 10) = 10
      expect(result).toBe(10);
    });

    it("should handle zero calories", () => {
      const result = toPoints({ calories: 0, subjectiveDay: 6 });

      // Formula: (0 * 0.1 + 6 * 2) = (0 + 12) = 12
      expect(result).toBe(12);
    });

    it("should treat zero subjectiveDay as falsy and use default", () => {
      const result = toPoints({ calories: 400, subjectiveDay: 0 });

      // Formula: When subjectiveDay is 0 (falsy), default to 5
      // (400 * 0.1 + 5 * 2) = (40 + 10) = 50
      expect(result).toBe(50);
    });

    it("should round to 1 decimal place", () => {
      const result = toPoints({ calories: 333, subjectiveDay: 7 });

      // Formula: (333 * 0.1 + 7 * 2) = (33.3 + 14) = 47.3
      expect(result).toBe(47.3);
    });

    it("should handle large calorie values", () => {
      const result = toPoints({ calories: 5000, subjectiveDay: 10 });

      // Formula: (5000 * 0.1 + 10 * 2) = (500 + 20) = 520
      expect(result).toBe(520);
    });

    it("should handle decimal calorie values", () => {
      const result = toPoints({ calories: 250.5, subjectiveDay: 5 });

      // Formula: (250.5 * 0.1 + 5 * 2) = (25.05 + 10) = 35.05 -> rounded to 35.1
      expect(result).toBe(35.1);
    });

    it("should handle decimal subjectiveDay values", () => {
      const result = toPoints({ calories: 300, subjectiveDay: 7.5 });

      // Formula: (300 * 0.1 + 7.5 * 2) = (30 + 15) = 45
      expect(result).toBe(45);
    });

    it("should handle negative calories by treating as number", () => {
      const result = toPoints({ calories: -100, subjectiveDay: 5 });

      // Formula: (-100 * 0.1 + 5 * 2) = (-10 + 10) = 0
      expect(result).toBe(0);
    });

    it("should handle negative subjectiveDay by treating as number", () => {
      const result = toPoints({ calories: 100, subjectiveDay: -2 });

      // Formula: (100 * 0.1 + -2 * 2) = (10 + -4) = 6
      expect(result).toBe(6);
    });

    it("should handle undefined values as defaults", () => {
      const result = toPoints({ calories: undefined, subjectiveDay: undefined });

      // Formula: (0 * 0.1 + 5 * 2) = (0 + 10) = 10
      expect(result).toBe(10);
    });

    it("should produce deterministic results for same inputs", () => {
      const result1 = toPoints({ calories: 400, subjectiveDay: 8 });
      const result2 = toPoints({ calories: 400, subjectiveDay: 8 });

      expect(result1).toBe(result2);
      expect(result1).toBe(56);
    });
  });
});
