// Mock for file-type package to avoid ESM module issues in Jest
// This is a CommonJS mock that Jest can use via moduleNameMapper
// The mock function will be replaced by Jest's mock system in tests that need to control it
const mockFileTypeFromBuffer = async (buffer) => {
  // Default behavior: return a valid image type for most test cases
  // Tests can override this by mocking the module directly
  if (!buffer || buffer.length === 0) {
    return null;
  }
  // Check if it looks like a JPEG (starts with FF D8)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // Check if it looks like a PNG (starts with 89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  // Default to PNG for test buffers that don't match known signatures
  return { mime: "image/png", ext: "png" };
};

module.exports = {
  fileTypeFromBuffer: mockFileTypeFromBuffer,
};
