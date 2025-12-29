import type { Request, Response } from "express";
import {
  listReportsHandler,
  moderateReportHandler,
  searchUsersHandler,
  userActionHandler,
  changeUserRoleHandler,
  sendVerificationEmailHandler,
  sendPasswordResetHandler,
  listActionMappingsHandler,
  upsertActionMappingHandler,
  deleteUserAvatarHandler,
  deleteUserDisplayNameHandler,
} from "../../../../apps/backend/src/modules/admin/admin.controller.js";
import * as adminService from "../../../../apps/backend/src/modules/admin/admin.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

jest.mock("../../../../apps/backend/src/modules/admin/admin.service.js", () => ({
  listReports: jest.fn(),
  moderateReport: jest.fn(),
  searchUsersService: jest.fn(),
  performUserAction: jest.fn(),
  changeUserRole: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  listActionUiMappings: jest.fn(),
  upsertActionUiMapping: jest.fn(),
  deleteUserAvatar: jest.fn(),
  deleteUserDisplayName: jest.fn(),
}));

const buildRes = () => {
  const res = { json: jest.fn() } as unknown as Response;
  return res;
};

describe("admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists reports with default paging and status", async () => {
    jest.mocked(adminService.listReports).mockResolvedValue([{ id: "r1" } as never]);
    const req = { query: {} } as Request;
    const res = buildRes();

    await listReportsHandler(req, res);

    expect(adminService.listReports).toHaveBeenCalledWith({
      status: "pending",
      limit: 50,
      offset: 0,
    });
    expect(res.json).toHaveBeenCalledWith({ reports: [{ id: "r1" }] });
  });

  it("rejects moderation without a user", async () => {
    const req = { params: { reportId: "r1" }, body: { action: "dismiss" } } as Request;
    const res = buildRes();

    await expect(moderateReportHandler(req, res)).rejects.toBeInstanceOf(HttpError);
  });

  it("moderates report and returns success message", async () => {
    const req = {
      params: { reportId: "r1" },
      body: { action: "hide" },
      user: { sub: "admin-1" },
    } as Request;
    const res = buildRes();

    await moderateReportHandler(req, res);

    expect(adminService.moderateReport).toHaveBeenCalledWith({
      reportId: "r1",
      action: "hide",
      adminId: "admin-1",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Report hidden successfully",
    });
  });

  it("requires a search query", async () => {
    const req = { query: {} } as Request;
    const res = buildRes();

    await expect(searchUsersHandler(req, res)).rejects.toBeInstanceOf(HttpError);
  });

  it("searches users with caps", async () => {
    jest.mocked(adminService.searchUsersService).mockResolvedValue([{ id: "u1" } as never]);
    const req = {
      query: { q: "alice", limit: "200", offset: "10", blacklisted: "true" },
    } as unknown as Request;
    const res = buildRes();

    await searchUsersHandler(req, res);

    expect(adminService.searchUsersService).toHaveBeenCalledWith({
      query: "alice",
      limit: 50,
      offset: 10,
      blacklisted: true,
    });
    expect(res.json).toHaveBeenCalledWith({ users: [{ id: "u1" }] });
  });

  it("validates user actions", async () => {
    const req = { params: { userId: "u1" }, body: { action: "nope" } } as Request;
    const res = buildRes();

    await expect(userActionHandler(req, res)).rejects.toBeInstanceOf(HttpError);
  });

  it("performs user actions with reason", async () => {
    const req = {
      params: { userId: "u1" },
      body: { action: "delete", reason: "abuse" },
      user: { sub: "admin-2" },
    } as Request;
    const res = buildRes();

    await userActionHandler(req, res);

    expect(adminService.performUserAction).toHaveBeenCalledWith({
      userId: "u1",
      action: "delete",
      adminId: "admin-2",
      reason: "abuse",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User deleted successfully",
    });
  });

  it("changes user role with reason", async () => {
    const req = {
      params: { userId: "u1" },
      body: { role: "coach", reason: "promotion" },
      user: { sub: "admin-3" },
    } as Request;
    const res = buildRes();

    await changeUserRoleHandler(req, res);

    expect(adminService.changeUserRole).toHaveBeenCalledWith("u1", "coach", "admin-3", "promotion");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "User role changed to coach successfully",
    });
  });

  it("triggers verification and reset emails", async () => {
    const req = { params: { userId: "u1" }, user: { sub: "admin-4" } } as Request;
    const res = buildRes();

    await sendVerificationEmailHandler(req, res);
    await sendPasswordResetHandler(req, res);

    expect(adminService.sendVerificationEmail).toHaveBeenCalledWith("u1", "admin-4");
    expect(adminService.sendPasswordResetEmail).toHaveBeenCalledWith("u1", "admin-4");
  });

  it("lists and upserts action mappings", async () => {
    jest.mocked(adminService.listActionUiMappings).mockResolvedValue([{ action: "ban" } as never]);
    jest.mocked(adminService.upsertActionUiMapping).mockResolvedValue({ action: "ban" } as never);

    const listReq = {} as Request;
    const res = buildRes();
    await listActionMappingsHandler(listReq, res);
    expect(res.json).toHaveBeenCalledWith({ mappings: [{ action: "ban" }] });

    const upsertReq = {
      body: { action: "ban", uiName: "Ban user" },
      user: { sub: "admin-5" },
    } as Request;
    await upsertActionMappingHandler(upsertReq, res);
    expect(res.json).toHaveBeenCalledWith({ mapping: { action: "ban" } });
  });

  it("deletes user avatar and display name", async () => {
    const req = {
      params: { userId: "u1" },
      body: { reason: "policy" },
      user: { sub: "admin-6" },
    } as Request;
    const res = buildRes();

    await deleteUserAvatarHandler(req, res);
    await deleteUserDisplayNameHandler(req, res);

    expect(adminService.deleteUserAvatar).toHaveBeenCalledWith("u1", "admin-6", "policy");
    expect(adminService.deleteUserDisplayName).toHaveBeenCalledWith("u1", "admin-6", "policy");
  });
});
