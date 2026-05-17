export type InventoryUnitStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "RETURNED"
  | "DAMAGED"
  | "REPAIR"
  | "LOST"
  | "TRANSFERRED";

export type InventoryUnitCondition = "NEW" | "USED" | "REFURBISHED" | "OPEN_BOX";

export type StockInUnitPayload = {
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
  condition?: InventoryUnitCondition;
  warrantyMonths?: number;
};
