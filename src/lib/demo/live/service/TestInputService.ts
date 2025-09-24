export class TestInputService {
	static create() {
		return new TestInputService();
	}

	counter = 0;
	fetchData = async (input: string) => {
		console.warn(`Fetching input: "${input}"`);
		const results = [];
		// Put a large delay for the first item.
		const delay = this.counter === 0 ? 3000 : 1000;
		this.counter += 1;
		results.push(`Result for input: '${input}'`);
		console.warn(`${input} will fetch with delay of ${delay}ms`);
		await new Promise((resolve) => setTimeout(resolve, delay));
		return results;
	};
}
