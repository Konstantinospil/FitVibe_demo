import { describe, it, expect } from "@jest/globals";
import { createPagination, type Pagination } from "../../../apps/backend/src/utils/pagination.js";

describe("pagination", () => {
  describe("createPagination", () => {
    it("should create pagination with default values", () => {
      const result = createPagination();
      expect(result).toEqual({
        limit: 25,
        offset: 0,
      });
    });

    it("should create pagination for first page", () => {
      const result = createPagination(1, 10);
      expect(result).toEqual({
        limit: 10,
        offset: 0,
      });
    });

    it("should create pagination for second page", () => {
      const result = createPagination(2, 10);
      expect(result).toEqual({
        limit: 10,
        offset: 10,
      });
    });

    it("should create pagination for third page", () => {
      const result = createPagination(3, 10);
      expect(result).toEqual({
        limit: 10,
        offset: 20,
      });
    });

    it("should handle custom page size", () => {
      const result = createPagination(1, 50);
      expect(result).toEqual({
        limit: 50,
        offset: 0,
      });
    });

    it("should handle large page numbers", () => {
      const result = createPagination(100, 25);
      expect(result).toEqual({
        limit: 25,
        offset: 2475, // (100 - 1) * 25
      });
    });

    it("should enforce minimum limit of 1", () => {
      const result = createPagination(1, 0);
      expect(result).toEqual({
        limit: 1,
        offset: 0,
      });
    });

    it("should enforce minimum limit of 1 for negative values", () => {
      const result = createPagination(1, -5);
      expect(result).toEqual({
        limit: 1,
        offset: 0,
      });
    });

    it("should enforce minimum offset of 0", () => {
      const result = createPagination(0, 10);
      expect(result).toEqual({
        limit: 10,
        offset: 0, // Math.max(0, (0 - 1) * 10) = Math.max(0, -10) = 0
      });
    });

    it("should handle page 0 with offset calculation", () => {
      const result = createPagination(0, 25);
      expect(result).toEqual({
        limit: 25,
        offset: 0,
      });
    });

    it("should handle negative page numbers", () => {
      const result = createPagination(-1, 10);
      expect(result).toEqual({
        limit: 10,
        offset: 0, // Math.max(0, (-1 - 1) * 10) = Math.max(0, -20) = 0
      });
    });

    it("should calculate offset correctly for various page sizes", () => {
      const testCases = [
        { page: 1, pageSize: 10, expectedOffset: 0 },
        { page: 2, pageSize: 10, expectedOffset: 10 },
        { page: 3, pageSize: 10, expectedOffset: 20 },
        { page: 1, pageSize: 20, expectedOffset: 0 },
        { page: 2, pageSize: 20, expectedOffset: 20 },
        { page: 5, pageSize: 20, expectedOffset: 80 },
      ];

      testCases.forEach(({ page, pageSize, expectedOffset }) => {
        const result = createPagination(page, pageSize);
        expect(result.offset).toBe(expectedOffset);
        expect(result.limit).toBe(pageSize);
      });
    });

    it("should return Pagination type", () => {
      const result = createPagination(1, 25);
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(typeof result.limit).toBe("number");
      expect(typeof result.offset).toBe("number");
    });
  });
});
