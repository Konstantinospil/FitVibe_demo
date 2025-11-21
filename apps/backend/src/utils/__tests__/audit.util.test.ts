export {};

const insertAuditMock = jest.fn();

jest.mock("../../modules/common/audit.util.js", () => ({
  insertAudit: insertAuditMock,
}));

describe("utils/audit.util", () => {
  it("re-exports insertAudit from the common audit utilities", async () => {
    const module = await import("../audit.util");

    expect(module.insertAudit).toBe(insertAuditMock);
  });
});
