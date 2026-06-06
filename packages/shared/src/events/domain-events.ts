export const DomainEventNames = {
  UserCreated: "user.created",
  OrderCreated: "order.created",
  PaymentCompleted: "payment.completed",
} as const;

export type DomainEventName = (typeof DomainEventNames)[keyof typeof DomainEventNames];

export type DomainEventPayloads = {
  [DomainEventNames.UserCreated]: {
    userId: string;
    email: string;
  };
  [DomainEventNames.OrderCreated]: {
    orderId: string;
    userId: string;
    paymentId?: string;
    total?: number;
  };
  [DomainEventNames.PaymentCompleted]: {
    paymentId: string;
    orderId: string;
    userId?: string;
    amount: number;
  };
};

export type DomainEvent<TName extends DomainEventName = DomainEventName> = {
  id: string;
  name: TName;
  occurredAt: string;
  payload: DomainEventPayloads[TName];
};
