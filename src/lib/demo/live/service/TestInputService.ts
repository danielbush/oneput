export class TestInputService {
	counter = 0;
	fetchData = async (input: string) => {
		const results = [];
		// Put a large delay for the first item.
		const delay = this.counter === 0 ? 8000 : 1000;
		this.counter += 1;
		for (let i = 0; i < input.length; i++) {
			results.push(`Result: '${input[i]}' (${i + 1} of ${input.length})`);
		}
		// await new Promise((resolve) => setTimeout(resolve, 1000 + 1000 * Math.random()));
		console.warn(`${input} will fetch with delay of ${delay}ms`);
		await new Promise((resolve) => setTimeout(resolve, delay));
		return results;
	};
}
