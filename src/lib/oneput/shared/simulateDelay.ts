import { ResultAsync } from 'neverthrow';

export const simulateDelay = (ms: number = 1000) =>
	ResultAsync.fromSafePromise(
		new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve(void 0);
			}, ms);
		})
	);
