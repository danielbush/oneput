/** Hold one scheduled call and the result shared by its callers. */
type PendingCall<Input, Output> = {
  input: Input;
  requestCount: number;
  promise: Promise<Output>;
  resolve: (output: Output) => void;
  reject: (error: unknown) => void;
};

/** Describe the requests combined into one task. */
export type CoalescedBatch<Input> = {
  requestCount: number;
  input: Input;
};

/** Configure how calls merge and how combined batches are observed. */
type CoalesceOptions<Input> = {
  merge: (current: Input, next: Input) => Input;
  onBatch?: (batch: CoalescedBatch<Input>) => void;
};

/** Wrap an asynchronous task so calls in one synchronous turn run as one batch.
 *
 * The first call schedules the task with `queueMicrotask`. Calls made before
 * that microtask starts merge their input and share its result. The batch is
 * released before the task starts, so calls made while it runs schedule a new
 * trailing batch.
 *
 * This removes duplicate work without adding a timer-based debounce delay.
 *
 * @see INVALIDATION_REBUILD_FEEDBACK_LOOP for why this exists.
 */
export function coalesce<Input, Output>(
  options: CoalesceOptions<Input>,
  task: (input: Input) => Promise<Output>
): (input: Input) => Promise<Output> {
  let pending: PendingCall<Input, Output> | undefined;

  return (input) => {
    if (pending) {
      pending.input = options.merge(pending.input, input);
      pending.requestCount += 1;
      return pending.promise;
    }

    let resolve!: (output: Output) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<Output>((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const scheduled: PendingCall<Input, Output> = {
      input,
      requestCount: 1,
      promise,
      resolve,
      reject
    };

    pending = scheduled;
    queueMicrotask(() => {
      pending = undefined;
      if (scheduled.requestCount > 1) {
        options.onBatch?.({
          requestCount: scheduled.requestCount,
          input: scheduled.input
        });
      }
      try {
        void task(scheduled.input).then(scheduled.resolve, scheduled.reject);
      } catch (error) {
        scheduled.reject(error);
      }
    });

    return promise;
  };
}
