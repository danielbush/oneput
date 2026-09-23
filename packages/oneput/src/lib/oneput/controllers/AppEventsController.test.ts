import { describe, expect, test } from 'vitest';
import { AppEventsController } from './AppEventsController.js';

describe('AppEventsController', () => {
  test('on: subscriber - receives the payload', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: unknown[] = [];
    appEvents.on('node-click', (payload) => received.push(payload));

    // act
    appEvents.emit({ type: 'node-click', payload: { id: 'n1' } });

    // assert
    expect(received).toEqual([{ id: 'n1' }]);
  });

  test('on: subscriber - ignores another event name', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: unknown[] = [];
    appEvents.on('node-click', (payload) => received.push(payload));

    // act
    appEvents.emit({ type: 'edge-click' });

    // assert
    expect(received).toEqual([]);
  });

  test('on: subscribers - every one receives the event', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: string[] = [];
    appEvents.on('node-click', () => received.push('first'));
    appEvents.on('node-click', () => received.push('second'));

    // act
    appEvents.emit({ type: 'node-click' });

    // assert
    expect(received).toEqual(['first', 'second']);
  });

  test('on: unsubscribe - stops delivery', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: unknown[] = [];
    const off = appEvents.on('node-click', (payload) => received.push(payload));

    // act
    off();
    appEvents.emit({ type: 'node-click' });

    // assert
    expect(received).toEqual([]);
  });

  test('on: unsubscribe during emit - other subscribers still run', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: string[] = [];
    const off = appEvents.on('node-click', () => {
      received.push('first');
      off();
    });
    appEvents.on('node-click', () => received.push('second'));

    // act
    appEvents.emit({ type: 'node-click' });
    appEvents.emit({ type: 'node-click' });

    // assert
    expect(received).toEqual(['first', 'second', 'second']);
  });

  test('onAny: subscriber - receives every event', () => {
    // arrange
    const appEvents = new AppEventsController();
    const received: unknown[] = [];
    appEvents.onAny((event) => received.push(event));

    // act
    appEvents.emit({ type: 'node-click', payload: { id: 'n1' } });
    appEvents.emit({ type: 'edge-click' });

    // assert
    expect(received).toEqual([
      { type: 'node-click', payload: { id: 'n1' } },
      { type: 'edge-click' }
    ]);
  });

  test('emit: no subscriber - does nothing', () => {
    // arrange
    const appEvents = new AppEventsController();

    // act / assert
    expect(() => appEvents.emit({ type: 'node-click' })).not.toThrow();
  });
});
