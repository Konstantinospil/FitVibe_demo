import "@testing-library/jest-dom";
import { ensurePrivateTranslationsLoaded } from "../src/i18n/config";

beforeAll(async () => {
  await ensurePrivateTranslationsLoaded();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  // Ensure fake timers are cleaned up after each test
  if (vi.isFakeTimers()) {
    vi.useRealTimers();
  }

  // Timer cleanup is handled by vi.useRealTimers() above
  // Fake timers are automatically cleaned up when restored
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverMock;
}

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Ensure window.URL.createObjectURL is available in test environment
if (typeof window !== "undefined" && window.URL && !window.URL.createObjectURL) {
  Object.defineProperty(window.URL, "createObjectURL", {
    writable: true,
    configurable: true,
    value: vi.fn(() => "blob:mock-url"),
  });
}

// jsdom does not ship a real canvas implementation, so provide a lightweight mock
const originalGetContext = HTMLCanvasElement.prototype.getContext.bind(HTMLCanvasElement.prototype);

const getNumericDimension = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

class MockCanvasRenderingContext2D implements Partial<CanvasRenderingContext2D> {
  public canvas: HTMLCanvasElement;
  public textBaseline: CanvasTextBaseline = "alphabetic";
  public font = "10px sans-serif";
  public fillStyle: string | CanvasGradient | CanvasPattern = "#000";
  private signature = "empty";
  private readonly size: () => { width: number; height: number };

  constructor(canvas: HTMLCanvasElement, size: () => { width: number; height: number }) {
    this.canvas = canvas;
    this.size = size;
  }

  clearRect(_x: number, _y: number, _width: number, _height: number) {
    const { width, height } = this.size();
    this.signature = `clear:${width}x${height}`;
  }

  fillText(text: string, x: number, y: number, maxWidth?: number) {
    const { width, height } = this.size();
    const fillStyleStr =
      typeof this.fillStyle === "string" ? this.fillStyle : "[CanvasGradient/Pattern]";
    this.signature = `text:${text}:${x}:${y}:${maxWidth ?? "auto"}:${width}x${height}:${this.font}:${this.textBaseline}:${fillStyleStr}`;
  }

  measureText(text: string): TextMetrics {
    const approxWidth = Math.max(1, Math.floor(text.length * 7));
    return {
      width: approxWidth,
      actualBoundingBoxAscent: approxWidth,
      actualBoundingBoxDescent: 0,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: approxWidth,
      fontBoundingBoxAscent: approxWidth,
      fontBoundingBoxDescent: 0,
      emHeightAscent: approxWidth,
      emHeightDescent: 0,
      hangingBaseline: 0,
      alphabeticBaseline: 0,
      ideographicBaseline: 0,
    } as TextMetrics;
  }

  resetSignature(seed: string) {
    this.signature = seed;
  }

  snapshot(mimeType: string, width: number, height: number) {
    return `data:${mimeType};${width}x${height};${this.signature}`;
  }
}

type MockCanvasState = {
  context: MockCanvasRenderingContext2D;
  resize: (width: number, height: number) => void;
  snapshot: (type?: string) => string;
  getDimensions: () => { width: number; height: number };
};

const mockCanvasStates = new WeakMap<HTMLCanvasElement, MockCanvasState>();

const ensureMockCanvasState = (element: HTMLCanvasElement): MockCanvasState => {
  let state = mockCanvasStates.get(element);

  if (!state) {
    let width = getNumericDimension(element.width, 300);
    let height = getNumericDimension(element.height, 150);

    const context = new MockCanvasRenderingContext2D(element, () => ({ width, height }));
    context.resetSignature(`blank:${width}x${height}`);

    state = {
      context,
      resize(newWidth: number, newHeight: number) {
        width = newWidth;
        height = newHeight;
        context.resetSignature(`resize:${newWidth}x${newHeight}`);
      },
      snapshot(type?: string) {
        const mime = typeof type === "string" && type.length > 0 ? type : "image/png";
        return context.snapshot(mime, width, height);
      },
      getDimensions() {
        return { width, height };
      },
    };

    mockCanvasStates.set(element, state);
  }

  return state;
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value(
    this: HTMLCanvasElement,
    type: string,
    contextAttributes?: CanvasRenderingContext2DSettings,
  ) {
    if (type === "2d") {
      const state = ensureMockCanvasState(this);
      return state.context as unknown as CanvasRenderingContext2D;
    }

    return originalGetContext
      ? originalGetContext.call(this, type, contextAttributes as never)
      : null;
  },
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  configurable: true,
  value(this: HTMLCanvasElement, type?: string, _quality?: unknown) {
    const state = ensureMockCanvasState(this);
    return state.snapshot(type);
  },
});

const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width");
if (widthDescriptor?.set) {
  Object.defineProperty(HTMLCanvasElement.prototype, "width", {
    ...widthDescriptor,
    set(this: HTMLCanvasElement, value: number) {
      widthDescriptor.set!.call(this, value);
      const state = mockCanvasStates.get(this);
      if (state) {
        const { height } = state.getDimensions();
        state.resize(getNumericDimension(value, 300), height);
      }
    },
  });
}

const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "height");
if (heightDescriptor?.set) {
  Object.defineProperty(HTMLCanvasElement.prototype, "height", {
    ...heightDescriptor,
    set(this: HTMLCanvasElement, value: number) {
      heightDescriptor.set!.call(this, value);
      const state = mockCanvasStates.get(this);
      if (state) {
        const { width } = state.getDimensions();
        state.resize(width, getNumericDimension(value, 150));
      }
    },
  });
}
