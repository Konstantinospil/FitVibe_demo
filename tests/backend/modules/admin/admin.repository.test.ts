import { db } from "../../../../apps/backend/src/db/index.js";
import * as adminRepository from "../../../../apps/backend/src/modules/admin/admin.repository.js";
import type {
  ListReportsQuery,
  SearchUsersQuery,
} from "../../../../apps/backend/src/modules/admin/admin.types.js";

// Mock db
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(1),
    raw: jest.fn().mockReturnValue({}),
  });
  (builder as any).raw = jest.fn().mockReturnValue({});
  // Add orWhere for searchUsers
  (builder as any).orWhere = jest.fn().mockReturnThis();
  return builder;
}

jest.mock("../../../../apps/backend/src/db/index.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock & {
    raw: jest.Mock;
  };

  mockDbFunction.raw = jest.fn().mockReturnValue({});

  return {
    default: mockDbFunction,
    db: mockDbFunction,
  };
});

describe("Admin Repository", () => {
  const userId = "user-123";
  const reportId = "report-123";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("listFeedReports", () => {
    it("should list feed reports", async () => {
      const query: ListReportsQuery = {};
      const mockReports: adminRepository.FeedReport[] = [];

      const dbModule = await import("../../../../apps/backend/src/db/index.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("feed_reports");
      if (queryBuilders["feed_reports"]) {
        queryBuilders["feed_reports"].select.mockResolvedValue(mockReports);
      }

      const result = await adminRepository.listFeedReports(query);

      expect(result).toEqual(mockReports);
    });
  });

  describe("getFeedReportById", () => {
    it("should get feed report by id", async () => {
      const mockReport: adminRepository.FeedReport = {
        id: reportId,
        reporterId: userId,
        reporterUsername: "testuser",
        feedItemId: "feed-item-123",
        commentId: null,
        reason: "spam",
        details: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        contentPreview: null,
        contentAuthor: null,
      };

      const dbModule = await import("../../../../apps/backend/src/db/index.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("feed_reports as fr");
      if (queryBuilders["feed_reports as fr"]) {
        queryBuilders["feed_reports as fr"].first = jest.fn().mockResolvedValue(mockReport);
      }

      const result = await adminRepository.getFeedReportById(reportId);

      expect(result).toEqual(mockReport);
    });
  });

  describe("searchUsers", () => {
    it("should search users", async () => {
      const query: SearchUsersQuery = { query: "testuser", limit: 10 };
      const mockUsers: adminRepository.UserSearchResult[] = [];

      const dbModule = await import("../../../../apps/backend/src/db/index.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users as u");
      if (queryBuilders["users as u"]) {
        queryBuilders["users as u"].offset = jest.fn().mockResolvedValue(mockUsers);
      }

      const result = await adminRepository.searchUsers(query);

      expect(result).toEqual(mockUsers);
    });
  });
});

