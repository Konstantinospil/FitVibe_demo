import type { Application } from "express";
import { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";

type InvokeOptions = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type InvokeResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json: unknown;
};

const toBuffer = (value: unknown): Buffer | null => {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === "string") {
    return Buffer.from(value);
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  return null;
};

export const invokeExpress = async (
  app: Application,
  { method, url, headers, body }: InvokeOptions,
): Promise<InvokeResponse> => {
  const req = new IncomingMessage(new PassThrough() as any);
  req.method = method.toUpperCase();
  req.url = url;
  req.headers = headers ?? {};

  if (body !== undefined) {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    if (!req.headers["content-type"]) {
      req.headers["content-type"] = "application/json";
    }
    req.headers["content-length"] = Buffer.byteLength(payload).toString();
    req.push(payload);
  }
  req.push(null);

  const res = new ServerResponse(req);
  const chunks: Buffer[] = [];
  res.write = ((chunk: unknown) => {
    const buffer = toBuffer(chunk);
    if (buffer) {
      chunks.push(buffer);
    }
    return true;
  }) as typeof res.write;

  res.end = ((chunk?: unknown) => {
    const buffer = toBuffer(chunk);
    if (buffer) {
      chunks.push(buffer);
    }
    res.emit("finish");
    return res;
  }) as typeof res.end;

  const finished = new Promise<InvokeResponse>((resolve) => {
    res.on("finish", () => {
      const bodyText = Buffer.concat(chunks).toString("utf8");
      const headersRecord = res.getHeaders();
      const normalizedHeaders = Object.fromEntries(
        Object.entries(headersRecord).map(([key, value]) => [
          key.toLowerCase(),
          Array.isArray(value) ? value.map(String) : value ? String(value) : undefined,
        ]),
      );

      let parsedJson: unknown = null;
      if (bodyText) {
        try {
          parsedJson = JSON.parse(bodyText);
        } catch {
          parsedJson = null;
        }
      }

      resolve({
        statusCode: res.statusCode,
        headers: normalizedHeaders,
        body: bodyText,
        json: parsedJson,
      });
    });
  });

  app.handle(req, res);

  return finished;
};
