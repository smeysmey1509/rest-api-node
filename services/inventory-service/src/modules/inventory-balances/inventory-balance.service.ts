import { ClientSession, Types } from "mongoose";
import { AppError } from "@shared/errors/app-error";
import { ErrorCodes } from "@shared/errors/error-codes";
import { InventoryBalanceModel } from "./inventory-balance.model";

type BalanceKey = { variantId: Types.ObjectId; locationId: Types.ObjectId };

export const receiveBulkStock = async (
  key: BalanceKey,
  quantity: number,
  session?: ClientSession,
) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError("Stock quantity must be a positive integer.", 400, ErrorCodes.ValidationFailed);
  }
  return InventoryBalanceModel.findOneAndUpdate(
    key,
    [
      { $set: { onHand: { $add: [{ $ifNull: ["$onHand", 0] }, quantity] }, reserved: { $ifNull: ["$reserved", 0] }, safetyStock: { $ifNull: ["$safetyStock", 0] }, version: { $add: [{ $ifNull: ["$version", 0] }, 1] } } },
      { $set: { available: { $subtract: [{ $subtract: ["$onHand", "$reserved"] }, "$safetyStock"] }, updatedAt: "$$NOW", createdAt: { $ifNull: ["$createdAt", "$$NOW"] } } },
    ],
    { upsert: true, new: true, session },
  ).lean();
};

export const reserveBulkStock = async (
  key: BalanceKey,
  quantity: number,
  session?: ClientSession,
) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError("Reservation quantity must be a positive integer.", 400, ErrorCodes.ValidationFailed);
  }
  const balance = await InventoryBalanceModel.findOneAndUpdate(
    { ...key, available: { $gte: quantity } },
    { $inc: { reserved: quantity, available: -quantity, version: 1 } },
    { new: true, session },
  ).lean();
  if (!balance) {
    throw new AppError(
      "One or more items are no longer available.",
      409,
      ErrorCodes.InventoryInsufficient,
    );
  }
  return balance;
};

export const releaseBulkStock = async (key: BalanceKey, quantity: number, session?: ClientSession) => {
  const balance = await InventoryBalanceModel.findOneAndUpdate(
    { ...key, reserved: { $gte: quantity } },
    { $inc: { reserved: -quantity, available: quantity, version: 1 } },
    { new: true, session },
  ).lean();
  if (!balance) throw new AppError("Reservation cannot be released.", 409, ErrorCodes.InvalidStateTransition);
  return balance;
};

export const consumeBulkStock = async (key: BalanceKey, quantity: number, session?: ClientSession) => {
  const balance = await InventoryBalanceModel.findOneAndUpdate(
    { ...key, reserved: { $gte: quantity }, onHand: { $gte: quantity } },
    { $inc: { reserved: -quantity, onHand: -quantity, version: 1 } },
    { new: true, session },
  ).lean();
  if (!balance) throw new AppError("Reserved stock cannot be consumed.", 409, ErrorCodes.InvalidStateTransition);
  return balance;
};

