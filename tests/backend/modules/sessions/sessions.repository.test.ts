import { db } from "../../../../apps/backend/src/db/connection.js";
import * as sessionsRepository from "../../../../apps/backend/src/modules/sessions/sessions.repository.js";
import type {
  Session,
  SessionQuery,
} from "../../../../apps/backend/src/modules/sessions/sessions.types.js";

// Mock db
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    andWhereILike: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clone: jest.fn().mockImplementation(function (this: any) {
      return this;
    }),
    count: jest.fn().mockResolvedValue([{ count: "0" }]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    returning: jest.fn().mockResolvedValue([]),
    raw: jest.fn().mockReturnValue({}),
  });
  return builder;
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
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
    db: mockDbFunction,
  };
});

describe("Sessions Repository", () => {
  const userId = "user-123";
  const sessionId = "session-123";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("listSessions", () => {
    it("should list sessions with default query", async () => {
      const query: SessionQuery = {};
      const mockSessions: Session[] = [];

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("sessions");
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].count.mockResolvedValue([{ count: "0" }]);
        // Make orderBy().limit().offset() chainable
        queryBuilders["sessions"].orderBy.mockReturnThis();
        queryBuilders["sessions"].limit.mockReturnThis();
        queryBuilders["sessions"].offset.mockResolvedValue(mockSessions);
        queryBuilders["sessions"].clone.mockImplementation(function (this: any) {
          return this;
        });
      }

      const result = await sessionsRepository.listSessions(userId, query);

      expect(result.data).toEqual(mockSessions);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it("should filter by status", async () => {
      const query: SessionQuery = { status: "completed" };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("sessions");
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].count.mockResolvedValue([{ count: "1" }]);
        queryBuilders["sessions"].orderBy.mockReturnThis();
        queryBuilders["sessions"].limit.mockReturnThis();
        queryBuilders["sessions"].offset.mockResolvedValue([]);
        queryBuilders["sessions"].clone.mockImplementation(function (this: any) {
          return this;
        });
      }

      await sessionsRepository.listSessions(userId, query);

      expect(queryBuilders["sessions"]?.andWhere).toHaveBeenCalledWith({ status: "completed" });
    });
  });

  describe("getSessionById", () => {
    it("should get session by id", async () => {
      const mockSession: Session = {
        id: sessionId,
        owner_id: userId,
        title: "Test Session",
        planned_at: new Date().toISOString(),
        status: "planned",
        visibility: "private",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("sessions");
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].first.mockResolvedValue(mockSession);
      }

      const result = await sessionsRepository.getSessionById(sessionId, userId);

      expect(result).toEqual(mockSession);
      expect(queryBuilders["sessions"]?.where).toHaveBeenCalledWith({
        id: sessionId,
        owner_id: userId,
      });
    });

    it("should include deleted when option set", async () => {
      const mockSession: Session = {
        id: sessionId,
        owner_id: userId,
        title: "Test Session",
        planned_at: new Date().toISOString(),
        status: "planned",
        visibility: "private",
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.first.mockResolvedValue(mockSession);

      await sessionsRepository.getSessionById(sessionId, userId, { includeDeleted: true });

      expect(newBuilder.whereNull).not.toHaveBeenCalled();
    });
  });

  describe("getSessionWithDetails", () => {
    it("should get session with details", async () => {
      const mockSession: Session = {
        id: sessionId,
        owner_id: userId,
        title: "Test Session",
        planned_at: new Date().toISOString(),
        status: "planned",
        visibility: "private",
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      queryBuilders["session_exercises as se"] = newBuilder;
      queryBuilders["exercise_sets"] = newBuilder;
      newBuilder.first.mockResolvedValue(mockSession);
      newBuilder.select.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await sessionsRepository.getSessionWithDetails(sessionId, userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(sessionId);
      expect(result?.exercises).toEqual([]);
    });

    it("should return undefined when session not found", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.first.mockResolvedValue(undefined);

      const result = await sessionsRepository.getSessionWithDetails(sessionId, userId);

      expect(result).toBeUndefined();
    });
  });

  describe("createSession", () => {
    it("should create session", async () => {
      const sessionRow: Session = {
        id: sessionId,
        owner_id: userId,
        title: "New Session",
        planned_at: new Date().toISOString(),
        status: "planned",
        visibility: "private",
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.insert.mockResolvedValue(1);

      const result = await sessionsRepository.createSession(sessionRow);

      expect(result).toBe(1);
      expect(newBuilder.insert).toHaveBeenCalledWith(sessionRow);
    });

    it("should work with transaction", async () => {
      const sessionRow: Session = {
        id: sessionId,
        owner_id: userId,
        title: "New Session",
        planned_at: new Date().toISOString(),
        status: "planned",
        visibility: "private",
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.insert.mockResolvedValue(1);
      const mockTrx = ((_table: string) => newBuilder) as any;

      await sessionsRepository.createSession(sessionRow, mockTrx);

      expect(newBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("updateSession", () => {
    it("should update session", async () => {
      const updates: Partial<Session> = {
        title: "Updated Session",
        status: "completed",
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.update.mockResolvedValue(1);

      await sessionsRepository.updateSession(sessionId, userId, updates);

      expect(newBuilder.where).toHaveBeenCalledWith({
        id: sessionId,
        owner_id: userId,
      });
      expect(newBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
      expect(newBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        }),
      );
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.update.mockResolvedValue(1);
      const mockTrx = ((_table: string) => newBuilder) as any;

      await sessionsRepository.updateSession(sessionId, userId, { title: "Updated" }, mockTrx);

      expect(newBuilder.update).toHaveBeenCalled();
    });
  });

  describe("cancelSession", () => {
    it("should cancel session", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.update.mockResolvedValue(1);

      const result = await sessionsRepository.cancelSession(sessionId, userId);

      expect(result).toBe(1);
      expect(newBuilder.where).toHaveBeenCalledWith({
        id: sessionId,
        owner_id: userId,
      });
      expect(newBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
      expect(newBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "canceled",
          deleted_at: expect.any(String),
          updated_at: expect.any(String),
        }),
      );
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["sessions"] = newBuilder;
      newBuilder.update.mockResolvedValue(1);
      const mockTrx = ((_table: string) => newBuilder) as any;

      await sessionsRepository.cancelSession(sessionId, userId, mockTrx);

      expect(newBuilder.update).toHaveBeenCalled();
    });
  });

  describe("refreshSessionSummary", () => {
    it("should refresh session summary", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock & { raw: jest.Mock };
      dbFn.raw.mockResolvedValue({});

      await sessionsRepository.refreshSessionSummary();

      expect(dbFn.raw).toHaveBeenCalledWith("SELECT public.refresh_session_summary(?)", [true]);
    });

    it("should refresh session summary with concurrent false", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock & { raw: jest.Mock };
      dbFn.raw.mockResolvedValue({});

      await sessionsRepository.refreshSessionSummary(false);

      expect(dbFn.raw).toHaveBeenCalledWith("SELECT public.refresh_session_summary(?)", [false]);
    });
  });

  describe("sessionsExistAtDates", () => {
    it("should return existing session dates", async () => {
      const plannedDates = ["2024-01-15T10:00:00Z", "2024-01-16T10:00:00Z"];
      const mockRows = [
        { planned_at: "2024-01-15T10:00:00Z" },
        { planned_at: new Date("2024-01-16T10:00:00Z") },
      ];

      const newBuilder = createMockQueryBuilder(mockRows);
      queryBuilders["sessions"] = newBuilder;

      const result = await sessionsRepository.sessionsExistAtDates(userId, plannedDates);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe("2024-01-15T10:00:00.000Z");
      expect(newBuilder.where).toHaveBeenCalledWith({ owner_id: userId });
      expect(newBuilder.whereIn).toHaveBeenCalledWith("planned_at", plannedDates);
    });

    it("should return empty array for empty input", async () => {
      const result = await sessionsRepository.sessionsExistAtDates(userId, []);

      expect(result).toEqual([]);
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder([]);
      const mockTrx = ((_table: string) => newBuilder) as any;

      await sessionsRepository.sessionsExistAtDates(userId, ["2024-01-15"], mockTrx);

      expect(newBuilder.where).toHaveBeenCalled();
    });
  });

  describe("listSessionSets", () => {
    it("should list session sets", async () => {
      const mockSets = [
        {
          id: "set-1",
          exercise_id: "exercise-1",
          exercise_name: "Test Exercise",
          type_code: "strength",
          order_index: 0,
          reps: 10,
          weight_kg: 100,
          distance_m: null,
          duration_sec: null,
          rpe: null,
          notes: null,
        },
      ];

      const newBuilder = createMockQueryBuilder(mockSets);
      queryBuilders["exercise_sets as s"] = newBuilder;

      const result = await sessionsRepository.listSessionSets(sessionId);

      expect(result).toEqual(mockSets);
      expect(newBuilder.leftJoin).toHaveBeenCalled();
      expect(newBuilder.where).toHaveBeenCalledWith("se.session_id", sessionId);
      expect(newBuilder.orderBy).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder([]);
      queryBuilders["exercise_sets as s"] = newBuilder;
      const mockTrx = ((_table: string) => newBuilder) as any;

      await sessionsRepository.listSessionSets(sessionId, mockTrx);

      expect(newBuilder.leftJoin).toHaveBeenCalled();
    });
  });

  describe("replaceSessionExercises", () => {
    it("should replace session exercises", async () => {
      const exercises = [
        {
          id: "exercise-1",
          exercise_id: "ex-1",
          order_index: 1,
          notes: "Test notes",
          planned: {
            sets: 3,
            reps: 10,
            load: 100,
            distance: null,
            duration: null,
            rpe: null,
            rest: null,
            extras: {},
          },
          actual: null,
          sets: [],
        },
      ];

      const mockTrxQueryBuilder = createMockQueryBuilder();
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as any;

      mockTrxQueryBuilder.del.mockResolvedValue(1);
      mockTrxQueryBuilder.insert.mockResolvedValue([]);

      await sessionsRepository.replaceSessionExercises(mockTrx, sessionId, exercises);

      expect(mockTrxQueryBuilder.where).toHaveBeenCalledWith({ session_id: sessionId });
      expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle empty exercises array", async () => {
      const mockTrxQueryBuilder = createMockQueryBuilder();
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as any;

      mockTrxQueryBuilder.del.mockResolvedValue(1);

      await sessionsRepository.replaceSessionExercises(mockTrx, sessionId, []);

      expect(mockTrxQueryBuilder.where).toHaveBeenCalledWith({ session_id: sessionId });
      expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should insert planned attributes", async () => {
      const exercises = [
        {
          id: "exercise-1",
          exercise_id: "ex-1",
          order_index: 1,
          notes: null,
          planned: {
            sets: 3,
            reps: 10,
            load: 100,
            distance: null,
            duration: null,
            rpe: null,
            rest: null,
            extras: {},
          },
          actual: null,
          sets: [],
        },
      ];

      const mockTrxQueryBuilder = createMockQueryBuilder();
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as any;

      mockTrxQueryBuilder.del.mockResolvedValue(1);
      mockTrxQueryBuilder.insert.mockResolvedValue([]);

      await sessionsRepository.replaceSessionExercises(mockTrx, sessionId, exercises);

      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledTimes(2); // session_exercises + planned_attributes
    });

    it("should insert actual attributes", async () => {
      const exercises = [
        {
          id: "exercise-1",
          exercise_id: "ex-1",
          order_index: 1,
          notes: null,
          planned: null,
          actual: {
            sets: 3,
            reps: 10,
            load: 100,
            distance: null,
            duration: null,
            rpe: null,
            rest: null,
            extras: {},
            recorded_at: new Date().toISOString(),
          },
          sets: [],
        },
      ];

      const mockTrxQueryBuilder = createMockQueryBuilder();
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as any;

      mockTrxQueryBuilder.del.mockResolvedValue(1);
      mockTrxQueryBuilder.insert.mockResolvedValue([]);

      await sessionsRepository.replaceSessionExercises(mockTrx, sessionId, exercises);

      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledTimes(2); // session_exercises + actual_attributes
    });

    it("should insert exercise sets", async () => {
      const exercises = [
        {
          id: "exercise-1",
          exercise_id: "ex-1",
          order_index: 1,
          notes: null,
          planned: null,
          actual: null,
          sets: [
            {
              id: "set-1",
              order_index: 1,
              reps: 10,
              weight_kg: 100,
              distance_m: null,
              duration_sec: null,
              rpe: null,
              notes: null,
            },
          ],
        },
      ];

      const mockTrxQueryBuilder = createMockQueryBuilder();
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as any;

      mockTrxQueryBuilder.del.mockResolvedValue(1);
      mockTrxQueryBuilder.insert.mockResolvedValue([]);

      await sessionsRepository.replaceSessionExercises(mockTrx, sessionId, exercises);

      expect(mockTrxQueryBuilder.insert).toHaveBeenCalledTimes(2); // session_exercises + exercise_sets
    });
  });
});
