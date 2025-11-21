export type NormalizedError = {
  message: string;
  name?: string;
  stack?: string;
};

export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}
