import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";

export type TransitionMap<TState extends string> = Readonly<Record<TState, readonly TState[]>>;

export const assertTransition = <TState extends string>(
  current: TState,
  next: TState,
  transitions: TransitionMap<TState>,
): void => {
  if (current === next) return;
  if (!transitions[current]?.includes(next)) {
    throw new AppError(
      `Transition from ${current} to ${next} is not allowed.`,
      409,
      ErrorCodes.InvalidStateTransition,
      { current, next },
    );
  }
};

