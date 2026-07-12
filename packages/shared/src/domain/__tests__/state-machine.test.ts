import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../errors/error-codes";
import { invoiceTransitions, orderTransitions, paymentTransitions } from "../ecommerce-transitions";
import { assertTransition } from "../state-machine";

describe("domain state transitions", () => {
  it("allows documented transitions and idempotent repeats", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "CONFIRMED", orderTransitions)).not.toThrow();
    expect(() => assertTransition("SUCCESS", "SUCCESS", paymentTransitions)).not.toThrow();
    expect(() => assertTransition("PAID", "CLOSED", invoiceTransitions)).not.toThrow();
  });

  it("rejects skipped or reverse transitions with a stable code", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "COMPLETED", orderTransitions)).toThrowError(
      expect.objectContaining({ code: ErrorCodes.InvalidStateTransition, statusCode: 409 }),
    );
    expect(() => assertTransition("CLOSED", "PAID", invoiceTransitions)).toThrow();
  });
});

