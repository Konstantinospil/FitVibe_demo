import { createPagination } from "../pagination";

describe("pagination utility", () => {
  describe("createPagination", () => {
    it("should create pagination with default values", () => {
      const pagination = createPagination();

      expect(pagination).toEqual({
        limit: 25,
        offset: 0,
      });
    });

    it("should create pagination for first page", () => {
      const pagination = createPagination(1, 10);

      expect(pagination).toEqual({
        limit: 10,
        offset: 0,
      });
    });

    it("should create pagination for second page", () => {
      const pagination = createPagination(2, 10);

      expect(pagination).toEqual({
        limit: 10,
        offset: 10,
      });
    });

    it("should create pagination for third page", () => {
      const pagination = createPagination(3, 20);

      expect(pagination).toEqual({
        limit: 20,
        offset: 40,
      });
    });

    it("should handle custom page size", () => {
      const pagination = createPagination(1, 50);

      expect(pagination).toEqual({
        limit: 50,
        offset: 0,
      });
    });

    it("should handle page 10", () => {
      const pagination = createPagination(10, 25);

      expect(pagination).toEqual({
        limit: 25,
        offset: 225, // (10 - 1) * 25
      });
    });

    describe("edge cases", () => {
      it("should enforce minimum limit of 1", () => {
        const pagination = createPagination(1, 0);

        expect(pagination.limit).toBe(1);
      });

      it("should enforce minimum limit for negative values", () => {
        const pagination = createPagination(1, -10);

        expect(pagination.limit).toBe(1);
      });

      it("should enforce minimum offset of 0 for page 0", () => {
        const pagination = createPagination(0, 10);

        expect(pagination.offset).toBe(0);
      });

      it("should enforce minimum offset for negative page", () => {
        const pagination = createPagination(-5, 10);

        expect(pagination.offset).toBe(0);
      });

      it("should handle page 1 with zero page size", () => {
        const pagination = createPagination(1, 0);

        expect(pagination).toEqual({
          limit: 1,
          offset: 0,
        });
      });

      it("should handle page 2 with enforced minimum limit", () => {
        const pagination = createPagination(2, 0);

        expect(pagination).toEqual({
          limit: 1,
          offset: 1,
        });
      });

      it("should handle large page numbers", () => {
        const pagination = createPagination(1000, 100);

        expect(pagination).toEqual({
          limit: 100,
          offset: 99900,
        });
      });

      it("should handle fractional page (rounds down implicitly)", () => {
        const pagination = createPagination(2.5, 10);

        // JavaScript implicit conversion: (2.5 - 1) * 10 = 15
        expect(pagination.offset).toBe(15);
      });

      it("should handle fractional page size", () => {
        const pagination = createPagination(1, 10.5);

        // Math.max rounds to 10.5, which is valid
        expect(pagination.limit).toBe(10.5);
      });
    });

    describe("common use cases", () => {
      it("should paginate 100 items with 10 per page", () => {
        const pages = [];
        for (let page = 1; page <= 10; page++) {
          pages.push(createPagination(page, 10));
        }

        expect(pages[0]).toEqual({ limit: 10, offset: 0 });
        expect(pages[4]).toEqual({ limit: 10, offset: 40 });
        expect(pages[9]).toEqual({ limit: 10, offset: 90 });
      });

      it("should handle typical API pagination (page 1, size 20)", () => {
        const pagination = createPagination(1, 20);

        expect(pagination).toEqual({ limit: 20, offset: 0 });
      });

      it("should handle typical API pagination (page 5, size 50)", () => {
        const pagination = createPagination(5, 50);

        expect(pagination).toEqual({ limit: 50, offset: 200 });
      });

      it("should allow fetching all with large page size", () => {
        const pagination = createPagination(1, 10000);

        expect(pagination).toEqual({ limit: 10000, offset: 0 });
      });
    });

    describe("consistency", () => {
      it("should produce same result for same inputs", () => {
        const p1 = createPagination(3, 15);
        const p2 = createPagination(3, 15);

        expect(p1).toEqual(p2);
      });

      it("should be deterministic", () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(createPagination(5, 20));
        }

        const first = results[0];
        expect(results.every((r) => r.limit === first.limit && r.offset === first.offset)).toBe(
          true,
        );
      });
    });
  });
});
