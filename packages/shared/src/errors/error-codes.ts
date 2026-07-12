export const ErrorCodes = {
  ValidationFailed: "VALIDATION_FAILED",
  AuthenticationFailed: "AUTHENTICATION_FAILED",
  AuthorizationFailed: "AUTHORIZATION_FAILED",
  ResourceNotFound: "RESOURCE_NOT_FOUND",
  DuplicateIdentifier: "DUPLICATE_IDENTIFIER",
  InvalidStateTransition: "INVALID_STATE_TRANSITION",
  InventoryInsufficient: "INVENTORY_INSUFFICIENT",
  ReservationExpired: "RESERVATION_EXPIRED",
  IdempotencyConflict: "IDEMPOTENCY_CONFLICT",
  PaymentAmountMismatch: "PAYMENT_AMOUNT_MISMATCH",
  DuplicateProviderEvent: "DUPLICATE_PROVIDER_EVENT",
  InvoiceNotClosable: "INVOICE_NOT_CLOSABLE",
  ClosedInvoiceImmutable: "CLOSED_INVOICE_IMMUTABLE",
  ServiceUnavailable: "SERVICE_UNAVAILABLE",
  InternalError: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

