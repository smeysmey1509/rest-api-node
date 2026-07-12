import axios, { AxiosError, AxiosInstance, Method } from "axios";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";

export type InternalRequestContext = {
  requestId: string;
  correlationId: string;
  serviceToken?: string;
};

export type InternalRequest<TBody = unknown> = {
  method: Method;
  path: string;
  body?: TBody;
  context: InternalRequestContext;
  idempotencyKey?: string;
};

export class InternalHttpClient {
  private readonly client: AxiosInstance;

  constructor(baseURL: string, timeoutMs = 3000) {
    this.client = axios.create({ baseURL, timeout: timeoutMs });
  }

  async request<TResponse, TBody = unknown>({
    method,
    path,
    body,
    context,
    idempotencyKey,
  }: InternalRequest<TBody>): Promise<TResponse> {
    try {
      const response = await this.client.request<TResponse>({
        method,
        url: path,
        data: body,
        headers: {
          "x-request-id": context.requestId,
          "x-correlation-id": context.correlationId,
          ...(context.serviceToken ? { "x-service-token": context.serviceToken } : {}),
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: { code?: string; message?: string; details?: unknown } }>;
      const status = axiosError.response?.status;
      const downstream = axiosError.response?.data?.error;
      if (status && downstream) {
        throw new AppError(
          downstream.message ?? "Downstream service request failed.",
          status,
          downstream.code,
          downstream.details,
        );
      }
      throw new AppError(
        "A required service is unavailable.",
        503,
        ErrorCodes.ServiceUnavailable,
        { cause: axiosError.code ?? "DOWNSTREAM_ERROR" },
      );
    }
  }
}

