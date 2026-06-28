type LogLevel = "info" | "warn" | "error";

const write = (level: LogLevel, service: string, message: string, meta?: unknown) => {
  const payload = `[${new Date().toISOString()}] [${service}] ${message}`;

  if (meta === undefined) {
    console[level](payload);
    return;
  }

  console[level](payload, meta);
};

export const createLogger = (service: string) => ({
  info: (message: string, meta?: unknown) => write("info", service, message, meta),
  warn: (message: string, meta?: unknown) => write("warn", service, message, meta),
  error: (message: string, meta?: unknown) => write("error", service, message, meta),
});
