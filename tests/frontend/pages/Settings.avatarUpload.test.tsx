import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../src/services/api";
import { renderSettings, setupSettingsTests, mockUserData } from "./Settings.test.helpers";
<<<<<<< Updated upstream
import { cleanupQueryClient } from "../helpers/testQueryClient";

// Mock FileReader to prevent async timing issues in tests
// FileReader is asynchronous, so we need to properly mock it to complete in tests
const createMockFileReader = (): FileReader => {
  const mockReader = {
    result: null as string | ArrayBuffer | null,
    onloadend: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
    readAsDataURL: vi.fn(function (this: FileReader, file: Blob) {
      // Simulate async FileReader by using Promise.resolve().then() to ensure
      // it completes in the next microtask, allowing React state updates to flush
      // waitFor will handle React state updates properly
      Promise.resolve().then(() => {
        (this as any).result = `data:image/jpeg;base64,${btoa("fake-image-content")}`;
        if ((this as any).onloadend) {
          (this as any).onloadend.call(this, {} as ProgressEvent<FileReader>);
        }
      });
    }),
    onerror: null,
    onabort: null,
    onload: null,
    onloadstart: null,
    onprogress: null,
    readyState: 0,
    error: null,
    abort: vi.fn(),
    readAsText: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    readAsBinaryString: vi.fn(),
    DONE: 2,
    EMPTY: 0,
    LOADING: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as FileReader;
  return mockReader;
};

describe("Settings - Avatar Upload (FR-009)", () => {
  const queryClients: Array<any> = [];

  beforeEach(() => {
    setupSettingsTests();
    // Mock FileReader globally - create a new instance for each test
    (globalThis as any).FileReader = vi.fn(() =>
      createMockFileReader(),
    ) as unknown as typeof FileReader;
    vi.clearAllMocks();
    queryClients.length = 0; // Clear array
  });

  afterEach(() => {
    // Clean up all QueryClient instances to prevent memory leaks
    queryClients.forEach((queryClient) => {
      if (queryClient) {
        cleanupQueryClient(queryClient);
      }
    });
    queryClients.length = 0;
    cleanup();
    vi.clearAllTimers();
    // Ensure real timers are used
    vi.useRealTimers();
  });

  it("displays avatar upload section", async () => {
    const result = renderSettings();
    const { container } = result;
    // Store queryClient for cleanup
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======

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
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    await waitFor(
      () => {
        const selectButtons = screen.getAllByText(/select image/i);
<<<<<<< Updated upstream
        expect(Array.from(selectButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(selectButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("allows selecting an image file", async () => {
<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
<<<<<<< Updated upstream
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("rejects invalid file types", async () => {
<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("rejects files that are too large", async () => {
<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(fileInput).toBeDefined();
<<<<<<< Updated upstream

    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });

=======
    
    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    
>>>>>>> Stashed changes
    // Create a FileList-like object that can be accessed by the component
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as FileList;
<<<<<<< Updated upstream

=======
    
>>>>>>> Stashed changes
    // Trigger change event to run handleAvatarFileSelect
    fireEvent.change(fileInput, { target: { files: fileList } });

    // Wait for FileReader to complete and upload button to appear
<<<<<<< Updated upstream
    // FileReader is mocked to complete asynchronously, so we need to wait
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    // Re-query the input element and ensure files are set before clicking upload
    // This is needed because handleAvatarUpload reads from fileInputRef.current.files[0]
    // and the files property must be available when the upload function accesses it
    const currentFileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    expect(currentFileInput).toBeDefined();
    Object.defineProperty(currentFileInput, "files", {
      value: fileList,
      writable: false,
      configurable: true,
    });

    const uploadButtons = screen.getAllByText(/upload/i);
    const uploadButton = Array.from(uploadButtons).find((el) => container.contains(el))!;
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
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    await waitFor(
      () => {
        const avatarImages = container.querySelectorAll('img[alt="Profile avatar"]');
        expect(avatarImages.length).toBeGreaterThan(0);
      },
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    await waitFor(
      () => {
        const deleteButtons = screen.getAllByText(/delete/i);
<<<<<<< Updated upstream
        expect(Array.from(deleteButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(deleteButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const deleteButtons = screen.getAllByText(/delete/i);
    const deleteButton = Array.from(deleteButtons).find((el) => container.contains(el))!;
    fireEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me/avatar");
      },
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("handles avatar upload error", async () => {
    const { mockPost } = setupSettingsTests();
    mockPost.mockRejectedValue(new Error("Upload failed"));

<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
<<<<<<< Updated upstream
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const uploadButtons = screen.getAllByText(/upload/i);
    const uploadButton = Array.from(uploadButtons).find((el) => container.contains(el))!;
    fireEvent.click(uploadButton);

    await waitFor(
      () => {
        const errorTexts = screen.queryAllByText(/failed to upload|upload failed|error/i);
        expect(Array.from(errorTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("disables upload button while uploading", async () => {
    const { mockPost } = setupSettingsTests();
<<<<<<< Updated upstream
    // Create a promise that resolves after a short delay to simulate upload
    // Use a proper async delay that can be awaited
    mockPost.mockImplementation(
      () =>
        new Promise<{ data: Record<string, never> }>((resolve) => {
          // Use a short timeout to simulate upload delay
          // This is fine in tests as we're using real timers
          const timeoutId = setTimeout(() => {
            resolve({ data: {} as Record<string, never> });
          }, 50);
          // Store timeout ID for potential cleanup (though not needed here)
          (mockPost as any)._timeoutId = timeoutId;
        }),
    );

    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    mockPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100)),
    );

    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

<<<<<<< Updated upstream
    // Wait for FileReader to complete and upload button to appear
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
    // Wait for upload button to appear
    await waitFor(
      () => {
        const uploadButtons = screen.getAllByText(/upload/i);
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
    );

    const uploadButtons = screen.getAllByText(/upload/i);
    const uploadButton = Array.from(uploadButtons).find((el) => container.contains(el))!;
    fireEvent.click(uploadButton);

    // Button should be disabled during upload
    await waitFor(
      () => {
        const currentUploadButtons = screen.getAllByText(/upload/i);
        const currentButtonText = Array.from(currentUploadButtons).find((el) =>
          container.contains(el),
        );
        expect(currentButtonText).toBeInTheDocument();
        // Find the parent button element
        const buttonElement = currentButtonText?.closest("button");
        expect(buttonElement).toBeDisabled();
      },
<<<<<<< Updated upstream
      { timeout: 5000 },
=======
      { timeout: 2000 },
>>>>>>> Stashed changes
    );
  });

  it("accepts JPEG, PNG, and WebP formats", async () => {
<<<<<<< Updated upstream
    const result = renderSettings();
    const { container } = result;
    if ((result as any).queryClient) {
      queryClients.push((result as any).queryClient);
    }
=======
    const { container } = renderSettings();
>>>>>>> Stashed changes

    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
<<<<<<< Updated upstream
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
=======
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        expect(Array.from(uploadButtons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
=======
        expect(
          Array.from(uploadButtons).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});


>>>>>>> Stashed changes
