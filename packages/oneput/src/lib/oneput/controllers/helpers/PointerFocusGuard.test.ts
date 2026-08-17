import { describe, expect, test } from 'vitest';
import { PointerFocusGuard } from './PointerFocusGuard.js';

describe('PointerFocusGuard', () => {
  test('allows pointerenter when it is not armed', () => {
    // arrange
    const guard = PointerFocusGuard.create();

    // act
    const ignore = guard.shouldIgnoreEnter(
      new PointerEvent('pointerenter', { clientX: 10, clientY: 10 })
    );

    // assert
    expect(ignore).toBe(false);
  });

  test('ignores pointerenter after arm when the pointer has not moved', () => {
    // arrange
    const guard = PointerFocusGuard.create();
    guard.arm();

    // act
    const ignore = guard.shouldIgnoreEnter(
      new PointerEvent('pointerenter', { clientX: 10, clientY: 10 })
    );

    // assert
    expect(ignore).toBe(true);
  });

  test('ignores pointerenter at the same coordinates after arm', () => {
    // arrange
    const guard = PointerFocusGuard.create();
    guard.onPointerMove(new PointerEvent('pointermove', { clientX: 40, clientY: 80 }));
    guard.acceptEnter(new PointerEvent('pointerenter', { clientX: 40, clientY: 80 }));
    guard.arm();

    // act
    const ignore = guard.shouldIgnoreEnter(
      new PointerEvent('pointerenter', { clientX: 40, clientY: 80 })
    );

    // assert
    expect(ignore).toBe(true);
  });

  test('does not disarm on pointermove at the same coordinates', () => {
    // arrange
    const guard = PointerFocusGuard.create();
    guard.onPointerMove(new PointerEvent('pointermove', { clientX: 40, clientY: 80 }));
    guard.arm();

    // act
    guard.onPointerMove(new PointerEvent('pointermove', { clientX: 40, clientY: 80 }));
    const ignore = guard.shouldIgnoreEnter(
      new PointerEvent('pointerenter', { clientX: 40, clientY: 80 })
    );

    // assert
    expect(ignore).toBe(true);
  });

  test('allows pointerenter after the pointer moves', () => {
    // arrange
    const guard = PointerFocusGuard.create();
    guard.onPointerMove(new PointerEvent('pointermove', { clientX: 40, clientY: 80 }));
    guard.arm();

    // act
    guard.onPointerMove(new PointerEvent('pointermove', { clientX: 40, clientY: 120 }));
    const ignore = guard.shouldIgnoreEnter(
      new PointerEvent('pointerenter', { clientX: 40, clientY: 120 })
    );

    // assert
    expect(ignore).toBe(false);
  });
});
