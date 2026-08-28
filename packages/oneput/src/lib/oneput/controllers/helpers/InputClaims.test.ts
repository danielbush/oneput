import { describe, expect, test, afterEach } from 'vitest';
import { Controller } from '../controller.js';

describe('InputClaims', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    const ctl = Controller.createNull();
    const input = ctl.currentProps.inputElement as HTMLInputElement;
    document.body.appendChild(input);
    return { ctl, input };
  }

  test('routes typed input to claim write', async () => {
    // arrange
    const { ctl } = setup();
    await ctl.input.setInputValue('filter-q');
    ctl.ui.update({ flags: { enableFilter: true } });
    const scope = ctl.input.openScope();
    let written = '';
    const claim = scope.claim({
      owner: { type: 'menu-item', itemId: 'label' },
      value: {
        read: () => 'field',
        write: (value) => {
          written = value;
        }
      },
      placeholder: 'Edit label...'
    });

    // act
    await ctl.input.typeText('x');

    // assert
    expect(written).toBe('fieldx');
    expect(ctl.input.hasActiveClaim).toBe(true);
    expect(ctl.menu.enableFilter).toBe(false);
    expect(claim.released).toBe(false);
  });

  test('release restores previous value and filter', async () => {
    // arrange
    const { ctl } = setup();
    await ctl.input.setInputValue('lab');
    ctl.input.setPlaceholder('Filter...');
    ctl.ui.update({ flags: { enableFilter: true } });
    const scope = ctl.input.openScope();
    const claim = scope.claim({
      owner: { type: 'menu-item', itemId: 'label' },
      value: {
        read: () => 'Node',
        write: () => {}
      },
      placeholder: 'Edit label...',
      resumePrevious: 'restore'
    });

    // act
    claim.release('back');

    // assert
    expect(claim.released).toBe(true);
    expect(ctl.input.hasActiveClaim).toBe(false);
    expect(ctl.input.getInputValue()).toBe('lab');
    expect(ctl.input.getPlaceholder()).toBe('Filter...');
    expect(ctl.menu.enableFilter).toBe(true);
  });

  test('stale release does not drop a newer claim', async () => {
    // arrange
    const { ctl } = setup();
    const scope = ctl.input.openScope();
    let firstWrites = 0;
    let secondWrites = 0;
    const first = scope.claim({
      owner: { type: 'menu-item', itemId: 'a' },
      value: {
        read: () => 'a',
        write: () => {
          firstWrites += 1;
        }
      }
    });
    const second = scope.claim({
      owner: { type: 'menu-item', itemId: 'b' },
      value: {
        read: () => 'b',
        write: () => {
          secondWrites += 1;
        }
      }
    });

    // act
    first.release('stale');
    await ctl.input.typeText('z');

    // assert
    expect(first.released).toBe(true);
    expect(second.released).toBe(false);
    expect(firstWrites).toBe(0);
    expect(secondWrites).toBe(1);
    expect(ctl.input.getInputValue()).toBe('bz');
  });

  test('scope close releases the active claim', async () => {
    // arrange
    const { ctl } = setup();
    await ctl.input.setInputValue('query');
    ctl.ui.update({ flags: { enableFilter: true } });
    const scope = ctl.input.openScope();
    const claim = scope.claim({
      owner: { type: 'menu-item', itemId: 'label' },
      value: {
        read: () => 'field',
        write: () => {}
      }
    });

    // act
    scope.close();

    // assert
    expect(claim.released).toBe(true);
    expect(ctl.input.hasActiveClaim).toBe(false);
    expect(ctl.input.getInputValue()).toBe('query');
    expect(ctl.menu.enableFilter).toBe(true);
  });

  test('skips AppObject onInputChange while claimed', async () => {
    // arrange
    const { ctl } = setup();
    const semantic: string[] = [];
    ctl.app.run({
      onStart: () => {},
      onInputChange: ({ value }) => {
        semantic.push(value);
      }
    });
    const scope = ctl.input.openScope();
    const claimed: string[] = [];
    scope.claim({
      owner: { type: 'menu-item', itemId: 'label' },
      value: {
        read: () => '',
        write: (value) => {
          claimed.push(value);
        }
      }
    });

    // act
    await ctl.input.typeText('hi');

    // assert
    expect(claimed).toEqual(['hi']);
    expect(semantic).toEqual([]);
  });
});
