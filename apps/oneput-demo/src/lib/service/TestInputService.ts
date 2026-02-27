import { randomId } from '@oneput/oneput';

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
    if (Math.random() < 0.15) {
      // if (this.counter % 4 === 3) {
      throw new Error('TestInputService: simulated error');
    }
    for (let i = 0; i < input.length; i++) {
      results.push({ id: randomId(), text: input[i] });
    }
    console.warn(`${input} will fetch with delay of ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return results;
  };
}
