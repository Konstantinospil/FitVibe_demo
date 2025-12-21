export {};

const insertAuditMock = jest.fn();

jest.mock("../../../apps/backend/src/modules/common/audit.util.js", () => ({
  insertAudit: insertAuditMock,
}));

describe("utils/audit.util", () => {
  it("re-exports insertAudit from the common audit utilities", async () => {
    const module = await import("../../../apps/backend/src/utils/audit.util.js");

    expect(module.insertAudit).toBe(insertAuditMock);
  });
});
