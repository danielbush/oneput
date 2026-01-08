import { ok, Result } from 'neverthrow';

export class SimulatedError extends Error {
  constructor(
    public service: string,
    message: string
  ) {
    super(message);
    this.name = 'SimulatedError';
  }
}

export const maybeSimulateError = Result.fromThrowable(
  (bool: boolean, msg: string, service: string) => {
    if (bool) {
      throw new SimulatedError(service, msg);
    }
    return ok();
  },
  (error) => error as SimulatedError
);
