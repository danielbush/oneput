export class TestInputService {
  static create() {
    return new TestInputService();
  }

  counter = 0;
  fetchData = async (input: string) => {
    console.warn(`Fetching input: "${input}"`);
    const results = [];
    // Put a large delay for the first item.
    const delay = this.counter === 0 ? 2000 : 1000;
    this.counter += 1;
    if (Math.random() < 0.1) {
      // if (this.counter % 4 === 3) {
      throw new Error('TestInputService: simulated error');
    }
    // Match each character across queries and give repeated characters unique IDs.
    const occurrences = new Map<string, number>();
    for (let i = 0; i < input.length; i++) {
      const text = input[i];
      const occurrence = (occurrences.get(text) ?? 0) + 1;
      occurrences.set(text, occurrence);
      results.push({ id: `result-${input.charCodeAt(i)}-${occurrence}`, text });
    }
    console.warn(`${input} will fetch with delay of ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return results;
  };
}
