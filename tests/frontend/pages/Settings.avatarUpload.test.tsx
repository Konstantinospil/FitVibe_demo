import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../src/services/api";
import { renderSettings, setupSettingsTests, mockUserData } from "./Settings.test.helpers";

describe("Settings - Avatar Upload (FR-009)", () => {
  beforeEach(() => {
    setupSettingsTests();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("displays avatar upload section", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const selectButtons = screen.getAllByText(/select image/i);
        expect(Array.from(selectButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("allows selecting an image file", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("rejects invalid file types", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["fake-pdf-content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show error message
    await waitFor(
      () => {
        const errorTexts = screen.queryAllByText(/invalid file type/i);
        expect(Array.from(errorTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("rejects files that are too large", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    // Create a file larger than 5MB
    const largeContent = new Array(6 * 1024 * 1024).fill("a").join("");
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show error message
    await waitFor(
      () => {
        const errorTexts = screen.queryAllByText(/too large/i);
        expect(Array.from(errorTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("uploads avatar successfully", async () => {
    const { mockPost } = setupSettingsTests();
    mockPost.mockResolvedValue({
      data: {
        success: true,
        fileUrl: "/users/avatar/user-1",
        bytes: 1024,
        mimeType: "image/png",
      },
    });

    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });

    // Create a FileList-like object that can be accessed by the component
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as FileList;

    // Trigger change event to run handleAvatarFileSelect
    fireEvent.change(fileInput, { target: { files: fileList } });

    const uploadButton = await screen.findByRole("button", { name: /^upload$/i });
    fireEvent.click(uploadButton);

    await waitFor(
      () => {
        expect(mockPost).toHaveBeenCalled();
        const callArgs = mockPost.mock.calls[0];
        expect(callArgs[0]).toBe("/api/v1/users/me/avatar");
        expect(callArgs[1]).toBeInstanceOf(FormData);
        expect(callArgs[2]).toMatchObject({
          headers: expect.objectContaining({
            "Content-Type": "multipart/form-data",
          }),
        });
      },
      { timeout: 2000 },
    );
  });

  it("displays existing avatar if available", async () => {
    const { mockGet } = setupSettingsTests();
    mockGet.mockResolvedValue({
      data: {
        ...mockUserData,
        avatar: {
          url: "/users/avatar/user-1",
          mimeType: "image/png",
          bytes: 1024,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const avatarImages = container.querySelectorAll('img[alt="Profile avatar"]');
        expect(avatarImages.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it("allows deleting avatar", async () => {
    const { mockGet, mockDelete } = setupSettingsTests();
    mockGet.mockResolvedValue({
      data: {
        ...mockUserData,
        avatar: {
          url: "/users/avatar/user-1",
          mimeType: "image/png",
          bytes: 1024,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const deleteButtons = screen.getAllByText(/delete/i);
        expect(Array.from(deleteButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const deleteButtons = screen.getAllByText(/delete/i);
    const deleteButton = Array.from(deleteButtons).find((el) => container.contains(el))!;
    fireEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me/avatar");
      },
      { timeout: 2000 },
    );
  });

  it("handles avatar upload error", async () => {
    const { mockPost } = setupSettingsTests();
    mockPost.mockRejectedValue(new Error("Upload failed"));

    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as FileList;

    fireEvent.change(fileInput, { target: { files: fileList } });

    const uploadButton = await screen.findByRole("button", { name: /^upload$/i });
    fireEvent.click(uploadButton);

    await waitFor(
      () => {
        expect(mockPost).toHaveBeenCalled();
        expect(
          screen.getAllByText("Failed to upload avatar. Please try again.").length,
        ).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it("disables upload button while uploading", async () => {
    const { mockPost } = setupSettingsTests();
    mockPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 1500)),
    );

    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = await screen.findByRole("button", { name: /^upload$/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^upload$/i })).toBeDisabled();
    });
  });

  it("accepts JPEG, PNG, and WebP formats", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");

    // Test JPEG
    const jpegFile = new File(["fake-image"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [jpegFile] } });
    // Wait for upload button to appear
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Reset
    fireEvent.change(fileInput, { target: { files: [] } });

    // Test PNG
    const pngFile = new File(["fake-image"], "test.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });
    // Wait for upload button to appear
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Reset
    fireEvent.change(fileInput, { target: { files: [] } });

    // Test WebP
    const webpFile = new File(["fake-image"], "test.webp", { type: "image/webp" });
    fireEvent.change(fileInput, { target: { files: [webpFile] } });
    // Wait for upload button to appear
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
