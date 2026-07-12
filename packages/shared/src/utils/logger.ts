type LogLevel = "info" | "warn" | "error";

const sensitiveKeys = /authorization|cookie|password|token|secret|card|cvv|signature/i;

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sensitiveKeys.test(key) ? "[REDACTED]" : redact(item)]),
    );
  }
  return value;
};

const write = (level: LogLevel, service: string, message: string, meta?: unknown) => {
  const payload = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service,
    environment: process.env.NODE_ENV ?? "development",
    message,
    ...(meta === undefined ? {} : { meta: redact(meta) }),
  });
  console[level](payload);
};

export const createLogger = (service: string) => ({
  info: (message: string, meta?: unknown) => write("info", service, message, meta),
  warn: (message: string, meta?: unknown) => write("warn", service, message, meta),
  error: (message: string, meta?: unknown) => write("error", service, message, meta),
});
