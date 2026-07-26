export class ElizaBot {
  quit: boolean;
  memSize: number;
  constructor(noRandomFlag?: boolean);
  transform(inputstring: string): string;
  getInitial(): string;
  getFinal(): string;
  reset(): void;
}

export default ElizaBot;
