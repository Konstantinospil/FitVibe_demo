import { db } from "../../../db/connection.js";
import * as sessionsRepository from "../sessions.repository.js";
import type { Session } from "../sessions.types.js";

// Mock the database connection
jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add raw helper to mock db
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Sessions Repository", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    whereNull: jest.Mock;
    whereIn: jest.Mock;
    whereNotNull: jest.Mock;
    andWhere: jest.Mock;
    andWhereILike: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    count: jest.Mock;
    clone: jest.Mock;
    select: jest.Mock;
    leftJoin: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      andWhereILike: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      count: jest.fn().mockResolvedValue([{ count: "0" }]),
      clone: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("listSessions", () => {
    it("should list sessions for user", async () => {
      const mockSessions = [
        {
          id: "session-1",
          owner_id: "user-123",
          title: "Morning Workout",
          status: "completed",
        },
      ];

      mockQueryBuilder.count.mockResolvedValue([{ count: "1" }]);

      // Mock clone to return promise
      (mockQueryBuilder as unknown as Promise<Session[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockSessions);
          return Promise.resolve(mockSessions);
        }) as never;

      const result = await sessionsRepository.listSessions("user-123", {});

      expect(result.data).toEqual(mockSessions);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ owner_id: "user-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
    });

    it("should filter by status", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await sessionsRepository.listSessions("user-123", { status: "completed" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith({ status: "completed" });
    });

    it("should filter by plan_id", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await sessionsRepository.listSessions("user-123", { plan_id: "plan-123" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith({ plan_id: "plan-123" });
    });

    it("should filter by date range", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await sessionsRepository.listSessions("user-123", {
        planned_from: "2024-01-01",
        planned_to: "2024-12-31",
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("planned_at", ">=", "2024-01-01");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("planned_at", "<=", "2024-12-31");
    });

    it("should search by title", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await sessionsRepository.listSessions("user-123", { search: "workout" });

      expect(mockQueryBuilder.andWhereILike).toHaveBeenCalledWith("title", "%workout%");
    });

    it("should apply pagination", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await sessionsRepository.listSessions("user-123", { limit: 20, offset: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });
  });

  describe("getSessionById", () => {
    it("should get session by id for user", async () => {
      const mockSession = {
        id: "session-123",
        owner_id: "user-123",
        title: "Test Session",
      };

      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await sessionsRepository.getSessionById("session-123", "user-123");

      expect(result).toEqual(mockSession);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        id: "session-123",
        owner_id: "user-123",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
    });

    it("should return undefined if not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await sessionsRepository.getSessionById("nonexistent", "user-123");

      expect(result).toBeUndefined();
    });

    it("should include deleted sessions if option is set", async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: "session-123" });

      await sessionsRepository.getSessionById("session-123", "user-123", { includeDeleted: true });

      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      mockQueryBuilder.first.mockResolvedValue({ id: "session-123" });

      const result = await sessionsRepository.getSessionById(
        "session-123",
        "user-123",
        {},
        mockTrx,
      );

      expect(result).toBeDefined();
      expect(mockTrx).toHaveBeenCalledWith("sessions");
    });
  });

  describe("getSessionWithDetails", () => {
    it("should return undefined if session not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await sessionsRepository.getSessionWithDetails("nonexistent", "user-123");

      expect(result).toBeUndefined();
    });

    it("should return session with exercises and sets", async () => {
      const mockSession = {
        id: "session-123",
        owner_id: "user-123",
        title: "Test Session",
      };

      const mockExerciseRows = [
        {
          id: "exercise-1",
          session_id: "session-123",
          exercise_id: "ex-1",
          order_index: 0,
          notes: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          planned_sets: 3,
          planned_reps: 10,
          planned_load: 100,
          planned_distance: null,
          planned_duration: null,
          planned_rpe: 7,
          planned_rest: "2min",
          planned_extras: {},
          actual_sets: 3,
          actual_reps: 10,
          actual_load: 100,
          actual_distance: null,
          actual_duration: null,
          actual_rpe: 8,
          actual_rest: "2min",
          actual_extras: {},
          actual_recorded_at: "2024-01-01T10:00:00Z",
        },
      ];

      const mockSetRows = [
        {
          id: "set-1",
          session_exercise_id: "exercise-1",
          order_index: 0,
          reps: 10,
          weight_kg: 100,
          distance_m: null,
          duration_sec: null,
          rpe: 8,
          notes: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock getSessionById - first db() call
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);
      mockQueryBuilder.first.mockResolvedValueOnce(mockSession);

      // Mock exercise query - second db() call
      const exerciseQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => {
          resolve(mockExerciseRows);
          return Promise.resolve(mockExerciseRows);
        }),
      };
      mockDb.mockReturnValueOnce(exerciseQueryBuilder as never);

      // Mock sets query - third db() call
      const setsQueryBuilder = {
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => {
          resolve(mockSetRows);
          return Promise.resolve(mockSetRows);
        }),
      };
      mockDb.mockReturnValueOnce(setsQueryBuilder as never);

      const result = await sessionsRepository.getSessionWithDetails("session-123", "user-123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("session-123");
      expect(result?.exercises).toHaveLength(1);
      expect(result?.exercises[0].sets).toHaveLength(1);
    });

    it("should handle session with no exercises", async () => {
      const mockSession = {
        id: "session-123",
        owner_id: "user-123",
        title: "Empty Session",
      };

      // Mock getSessionById - first db() call
      mockDb.mockReturnValueOnce(mockQueryBuilder as never);
      mockQueryBuilder.first.mockResolvedValueOnce(mockSession);

      // Mock exercise query - return empty array - second db() call
      const exerciseQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      };
      mockDb.mockReturnValueOnce(exerciseQueryBuilder as never);

      const result = await sessionsRepository.getSessionWithDetails("session-123", "user-123");

      expect(result).toBeDefined();
      expect(result?.exercises).toEqual([]);
    });
  });

  describe("createSession", () => {
    it("should insert session", async () => {
      const mockSession: Session = {
        id: "session-new",
        owner_id: "user-123",
        title: "New Session",
        status: "planned",
        planned_at: "2024-01-01",
        visibility: "private",
        points: null,
        completed_at: null,
        plan_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        deleted_at: null,
      };

      await sessionsRepository.createSession(mockSession);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(mockSession);
    });

    it("should work with transaction", async () => {
      const mockSession = { id: "session-1" } as Session;
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;

      await sessionsRepository.createSession(mockSession, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("sessions");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("updateSession", () => {
    it("should update session", async () => {
      await sessionsRepository.updateSession("session-123", "user-123", { title: "Updated" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        id: "session-123",
        owner_id: "user-123",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should set updated_at timestamp", async () => {
      await sessionsRepository.updateSession("session-123", "user-123", { title: "Updated" });

      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall).toHaveProperty("updated_at");
    });
  });

  describe("cancelSession", () => {
    it("should soft delete and mark as canceled", async () => {
      await sessionsRepository.cancelSession("session-123", "user-123");

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        id: "session-123",
        owner_id: "user-123",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");

      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.status).toBe("canceled");
      expect(updateCall.deleted_at).toBeDefined();
      expect(updateCall.updated_at).toBeDefined();
    });
  });

  describe("refreshSessionSummary", () => {
    it("should call refresh SQL function with concurrent=true", async () => {
      await sessionsRepository.refreshSessionSummary(true);

      expect(mockDb.raw).toHaveBeenCalledWith("SELECT public.refresh_session_summary(?)", [true]);
    });

    it("should call refresh SQL function with concurrent=false", async () => {
      await sessionsRepository.refreshSessionSummary(false);

      expect(mockDb.raw).toHaveBeenCalledWith("SELECT public.refresh_session_summary(?)", [false]);
    });
  });

  describe("sessionsExistAtDates", () => {
    it("should return empty array for empty input", async () => {
      const result = await sessionsRepository.sessionsExistAtDates("user-123", []);

      expect(result).toEqual([]);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it("should return existing dates", async () => {
      const mockRows = [{ planned_at: new Date("2024-01-01") }, { planned_at: "2024-01-02" }];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await sessionsRepository.sessionsExistAtDates("user-123", [
        "2024-01-01",
        "2024-01-02",
      ]);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ owner_id: "user-123" });
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith("planned_at", [
        "2024-01-01",
        "2024-01-02",
      ]);
    });
  });

  describe("replaceSessionExercises", () => {
    it("should delete existing exercises and insert new ones", async () => {
      const mockTrxQueryBuilder = {
        ...mockQueryBuilder,
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([]),
      };

      const mockTrx = jest.fn().mockReturnValue(mockTrxQueryBuilder) as never;

      const exercises = [
        {
          id: "exercise-1",
          exercise_id: "ex-1",
          order_index: 0,
          notes: "Test",
          planned: {
            sets: 3,
            reps: 10,
            load: 100,
            distance: null,
            duration: null,
            rpe: 7,
            rest: "2min",
            extras: {},
          },
          actual: null,
          sets: [
            {
              id: "set-1",
              order_index: 0,
              reps: 10,
              weight_kg: 100,
            },
          ],
        },
      ];

      await sessionsRepository.replaceSessionExercises(mockTrx, "session-123", exercises);

      expect(mockTrx).toHaveBeenCalledWith("session_exercises");
      expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
      expect(mockTrxQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle empty exercises array", async () => {
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(0),
      };

      const mockTrx = jest.fn().mockReturnValue(mockTrxQueryBuilder) as never;

      await sessionsRepository.replaceSessionExercises(mockTrx, "session-123", []);

      expect(mockTrx).toHaveBeenCalledWith("session_exercises");
      expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
    });
  });

  describe("listSessionSets", () => {
    it("should list sets for session", async () => {
      const mockSets = [
        {
          id: "set-1",
          exercise_id: "ex-1",
          exercise_name: "Bench Press",
          type_code: "strength",
          order_index: 0,
          reps: 10,
          weight_kg: 100,
          distance_m: null,
          duration_sec: null,
          rpe: 8,
          notes: null,
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockSets>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockSets);
          return Promise.resolve(mockSets);
        }) as never;

      const result = await sessionsRepository.listSessionSets("session-123");

      expect(result).toEqual(mockSets);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("se.session_id", "session-123");
    });
  });

  describe("Edge Cases", () => {
    describe("Boundary Conditions", () => {
      it("should handle session with maximum number of exercises (100+)", async () => {
        const mockSession = {
          id: "session-123",
          owner_id: "user-123",
          title: "Max Exercises Session",
        };

        const manyExercises = Array.from({ length: 150 }, (_, i) => ({
          id: `exercise-${i}`,
          session_id: "session-123",
          exercise_id: `ex-${i}`,
          order_index: i,
        }));

        mockQueryBuilder.first.mockResolvedValue(mockSession);

        (mockQueryBuilder as unknown as Promise<typeof manyExercises>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(manyExercises);
            return Promise.resolve(manyExercises);
          }) as never;

        const result = await sessionsRepository.getSessionWithDetails("session-123", "user-123", {
          includeDeleted: false,
        });

        expect(result).toBeDefined();
        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });

      it("should handle exercise with maximum number of sets (50+)", async () => {
        const manySets = Array.from({ length: 75 }, (_, i) => ({
          id: `set-${i}`,
          session_exercise_id: "session-exercise-123",
          order_index: i,
          reps: 10,
          weight_kg: 100,
        }));

        (mockQueryBuilder as unknown as Promise<typeof manySets>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(manySets);
            return Promise.resolve(manySets);
          }) as never;

        const result = await sessionsRepository.listSessionSets("session-123");

        expect(result).toEqual(manySets);
      });

      it("should handle large pagination offset", async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: "10000" }]);

        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        const result = await sessionsRepository.listSessions("user-123", {
          limit: 50,
          offset: 9950,
        });

        expect(result.total).toBe(10000);
        expect(mockQueryBuilder.offset).toHaveBeenCalledWith(9950);
      });

      it("should handle sessions at date boundaries (start of day)", async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        await sessionsRepository.listSessions("user-123", {
          planned_from: "2024-01-01T00:00:00.000Z",
          planned_to: "2024-01-01T00:00:00.001Z",
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });

      it("should handle sessions at date boundaries (end of day)", async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        await sessionsRepository.listSessions("user-123", {
          planned_from: "2024-01-01T23:59:59.999Z",
          planned_to: "2024-01-02T00:00:00.000Z",
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });
    });

    describe("Data Integrity", () => {
      it("should handle null values in exercise attributes", async () => {
        const mockSession = {
          id: "session-123",
          owner_id: "user-123",
          title: "Test Session",
        };

        const exercisesWithNulls = [
          {
            id: "exercise-1",
            session_id: "session-123",
            exercise_id: null,
            order_index: 0,
            notes: null,
            planned_sets: null,
            planned_reps: null,
          },
        ];

        mockQueryBuilder.first.mockResolvedValue(mockSession);

        (mockQueryBuilder as unknown as Promise<typeof exercisesWithNulls>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(exercisesWithNulls);
            return Promise.resolve(exercisesWithNulls);
          }) as never;

        const result = await sessionsRepository.getSessionWithDetails("session-123", "user-123", {
          includeDeleted: false,
        });

        expect(result).toBeDefined();
      });

      it("should handle extreme numeric values in sets", async () => {
        const extremeSets = [
          {
            id: "set-1",
            session_exercise_id: "session-exercise-123",
            order_index: 0,
            reps: 999999,
            weight_kg: 999999.99,
            distance_m: 999999.99,
            duration_sec: 999999,
          },
        ];

        (mockQueryBuilder as unknown as Promise<typeof extremeSets>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(extremeSets);
            return Promise.resolve(extremeSets);
          }) as never;

        const result = await sessionsRepository.listSessionSets("session-123");

        expect(result).toEqual(extremeSets);
      });

      it("should handle zero values in numeric fields", async () => {
        const zeroSets = [
          {
            id: "set-1",
            session_exercise_id: "session-exercise-123",
            order_index: 0,
            reps: 0,
            weight_kg: 0,
            distance_m: 0,
            duration_sec: 0,
            rpe: 0,
          },
        ];

        (mockQueryBuilder as unknown as Promise<typeof zeroSets>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(zeroSets);
            return Promise.resolve(zeroSets);
          }) as never;

        const result = await sessionsRepository.listSessionSets("session-123");

        expect(result).toEqual(zeroSets);
      });

      it("should handle special characters in session title search", async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);

        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        await sessionsRepository.listSessions("user-123", {
          search: 'Session\'s "Special" & <Characters> 100%',
        });

        expect(mockQueryBuilder.andWhereILike).toHaveBeenCalled();
      });
    });

    describe("Empty and Missing Data", () => {
      it("should handle session with empty title", async () => {
        const mockSession = {
          id: "session-123",
          owner_id: "user-123",
          title: "",
          status: "planned",
        };

        mockQueryBuilder.first.mockResolvedValue(mockSession);

        const result = await sessionsRepository.getSessionById("session-123", "user-123", {
          includeDeleted: false,
        });

        expect(result?.title).toBe("");
      });

      it("should handle replace with empty exercises array", async () => {
        const mockTrxQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          del: jest.fn().mockResolvedValue(0),
        };

        const mockTrx = jest.fn().mockReturnValue(mockTrxQueryBuilder) as never;

        await sessionsRepository.replaceSessionExercises(mockTrx, "session-123", []);

        expect(mockTrx).toHaveBeenCalledWith("session_exercises");
        expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
      });

      it("should handle sessionsExistAtDates with future dates", async () => {
        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        const futureDates = ["2099-12-31", "2100-01-01", "2100-06-30"];

        const result = await sessionsRepository.sessionsExistAtDates("user-123", futureDates);

        expect(result).toEqual([]);
      });

      it("should handle sessionsExistAtDates with past dates (historical)", async () => {
        const historicalDates = [{ planned_at: "1900-01-01" }, { planned_at: "1950-06-15" }];

        (mockQueryBuilder as unknown as Promise<typeof historicalDates>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(historicalDates);
            return Promise.resolve(historicalDates);
          }) as never;

        const result = await sessionsRepository.sessionsExistAtDates("user-123", [
          "1900-01-01",
          "1950-06-15",
          "1975-03-20",
        ]);

        // Function returns ISO strings
        expect(result).toHaveLength(2);
        expect(result[0]).toContain("1900-01-01");
        expect(result[1]).toContain("1950-06-15");
      });
    });

    describe("Complex Query Scenarios", () => {
      it("should handle list with all filters combined", async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: "5" }]);

        (mockQueryBuilder as unknown as Promise<[]>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve([]);
            return Promise.resolve([]);
          }) as never;

        const result = await sessionsRepository.listSessions("user-123", {
          status: "completed",
          plan_id: "plan-123",
          planned_from: "2024-01-01",
          planned_to: "2024-12-31",
          search: "workout",
          limit: 10,
          offset: 20,
        });

        expect(result.total).toBe(5);
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
        expect(mockQueryBuilder.where).toHaveBeenCalled();
        expect(mockQueryBuilder.andWhereILike).toHaveBeenCalled();
      });

      it("should handle replaceSessionExercises with mixed null and valid exercise_ids", async () => {
        const mixedExercises = [
          {
            id: "session-exercise-1",
            exercise_id: "exercise-123",
            order_index: 0,
            notes: "With exercise",
            planned: null,
            actual: null,
            sets: [],
          },
          {
            id: "session-exercise-2",
            exercise_id: null,
            order_index: 1,
            notes: "Custom exercise",
            planned: null,
            actual: null,
            sets: [],
          },
        ];

        const mockTrxQueryBuilder = {
          ...mockQueryBuilder,
          where: jest.fn().mockReturnThis(),
          del: jest.fn().mockResolvedValue(2),
          insert: jest.fn().mockResolvedValue([1, 2]),
        };

        const mockTrx = jest.fn().mockReturnValue(mockTrxQueryBuilder) as never;

        await sessionsRepository.replaceSessionExercises(mockTrx, "session-123", mixedExercises);

        expect(mockTrx).toHaveBeenCalledWith("session_exercises");
        expect(mockTrxQueryBuilder.del).toHaveBeenCalled();
        expect(mockTrxQueryBuilder.insert).toHaveBeenCalled();
      });

      it("should handle getSessionWithDetails with large nested data structure", async () => {
        const mockSession = {
          id: "session-123",
          owner_id: "user-123",
          title: "Complex Session",
        };

        const largeExercises = Array.from({ length: 20 }, (_, i) => ({
          id: `exercise-${i}`,
          session_id: "session-123",
          exercise_id: `ex-${i}`,
          order_index: i,
          sets: Array.from({ length: 10 }, (__, j) => ({
            id: `set-${i}-${j}`,
            order_index: j,
            reps: 10 + j,
            weight_kg: 50 + i * 5,
          })),
        }));

        mockQueryBuilder.first.mockResolvedValue(mockSession);

        (mockQueryBuilder as unknown as Promise<typeof largeExercises>).then = jest
          .fn()
          .mockImplementation((resolve) => {
            resolve(largeExercises);
            return Promise.resolve(largeExercises);
          }) as never;

        const result = await sessionsRepository.getSessionWithDetails(
          "session-123",
          "user-123",
          {},
        );

        expect(result).toBeDefined();
      });
    });

    describe("Concurrent Operations", () => {
      it("should handle concurrent refresh calls with different modes", async () => {
        mockDb.raw.mockReturnValue({
          timeout: jest.fn().mockReturnThis(),
          wrap: jest.fn().mockReturnThis(),
          toSQL: jest.fn().mockReturnValue({ sql: "", bindings: [] }),
          queryContext: jest.fn().mockReturnThis(),
        } as never);

        await Promise.all([
          sessionsRepository.refreshSessionSummary(true),
          sessionsRepository.refreshSessionSummary(false),
        ]);

        expect(mockDb.raw).toHaveBeenCalledTimes(2);
      });

      it("should handle multiple simultaneous session queries", async () => {
        const mockSessions = [
          { id: "session-1", owner_id: "user-123", title: "Session 1" },
          { id: "session-2", owner_id: "user-123", title: "Session 2" },
          { id: "session-3", owner_id: "user-123", title: "Session 3" },
        ];

        mockQueryBuilder.first
          .mockResolvedValueOnce(mockSessions[0])
          .mockResolvedValueOnce(mockSessions[1])
          .mockResolvedValueOnce(mockSessions[2]);

        const results = await Promise.all([
          sessionsRepository.getSessionById("session-1", "user-123", { includeDeleted: false }),
          sessionsRepository.getSessionById("session-2", "user-123", { includeDeleted: false }),
          sessionsRepository.getSessionById("session-3", "user-123", { includeDeleted: false }),
        ]);

        expect(results).toHaveLength(3);
        expect(results[0]?.id).toBe("session-1");
        expect(results[1]?.id).toBe("session-2");
        expect(results[2]?.id).toBe("session-3");
      });
    });
  });
});
