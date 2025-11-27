export function formatSecondsToHHMMSS(totalSeconds: number): string {
	const hours = Math.abs(Math.trunc(totalSeconds / 3600));
	const minutes = Math.abs(Math.trunc((totalSeconds % 3600) / 60));
	const seconds = Math.abs(Math.trunc(totalSeconds % 60));

	const HH = hours.toString().padStart(2, '0');
	const MM = minutes.toString().padStart(2, '0');
	const SS = seconds.toString().padStart(2, '0');
	const prefix = totalSeconds < 0 ? '-' : '';

	return `${prefix}${HH}:${MM}:${SS}`;
}
