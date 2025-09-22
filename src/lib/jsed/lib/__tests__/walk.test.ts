import { describe, expect, test } from 'vitest';
import { makeRoot, div, byId } from '../../test/util.js';
import { findNextNode, findPreviousNode } from '../walk.js';

describe('findNextNode - visit order', () => {
	test('row', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }),
				div({ id: '1-2' }),
				div({ id: '1-3' }),
				div({ id: '1-4' })
			)
		);
		const visited = [];
		const start = byId(doc, '1');
		const limit = byId(doc, '1');

		// act
		for (const el of findNextNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-1', '1-2', '1-3', '1-4']);
	});

	test('row+descend', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }, div({ id: '1-1-1' }), div({ id: '1-1-2' })),
				div({ id: '1-2' }, div({ id: '1-2-1' })),
				div({ id: '1-3' }, div({ id: '1-3-1' })),
				div({ id: '1-4' }, div({ id: '1-4-1' }))
			)
		);
		const visited = [];
		const start = byId(doc, '1');
		const limit = byId(doc, '1');

		// act
		for (const el of findNextNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual([
			'1-1',
			'1-1-1',
			'1-1-2',
			'1-2',
			'1-2-1',
			'1-3',
			'1-3-1',
			'1-4',
			'1-4-1'
		]);
	});

	test('row+ascend', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }, div({ id: '1-1-1' })),
				div({ id: '1-2' }),
				div({ id: '1-3' }),
				div({ id: '1-4' })
			)
		);
		const visited = [];
		const start = byId(doc, '1-1-1');
		const limit = byId(doc, '1');

		// act
		for (const el of findNextNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-2', '1-3', '1-4']);
	});

	test('row+ascend 2', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }, div({ id: '1-1-1' }, div({ id: '1-1-1-1' }), div({ id: '1-1-1-2' }))),
				div({ id: '1-2' }, div({ id: '1-2-1' }), div({ id: '1-2-2' })),
				div({ id: '1-3' }),
				div({ id: '1-4' })
			)
		);
		const visited = [];
		const start = byId(doc, '1-1-1-2');
		const limit = byId(doc, '1');

		// act
		for (const el of findNextNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-2', '1-2-1', '1-2-2', '1-3', '1-4']);
	});

	describe('start = limit', () => {
		test('should visit root and descend and visit pre-order', () => {
			// arrange
			const doc = makeRoot(div({ id: '1' }, div({ id: '2' }), div({ id: '3' })));
			const visited = [];
			const start = byId(doc, '1');
			const limit = start;
			// act
			for (const el of findNextNode(start, limit)) {
				visited.push((el as HTMLElement).id);
			}
			// assert
			expect(visited).toEqual(['2', '3']);
		});
	});
});

describe('findPreviousNode - visit order', () => {
	test('row', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }),
				div({ id: '1-2' }),
				div({ id: '1-3' }),
				div({ id: '1-4' })
			)
		);
		const visited = [];
		const start = byId(doc, '1-4');
		const limit = byId(doc, '1');

		// act
		for (const el of findPreviousNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-3', '1-2', '1-1']);
	});

	test('row+descend (1) - simple', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }, div({ id: '1-1-1' })),
				div({ id: '1-2' }, div({ id: '1-2-1' })),
				div({ id: '1-3' }, div({ id: '1-3-1' })),
				div({ id: '1-4' }, div({ id: '1-4-1' }))
			)
		);
		const visited = [];
		const start = byId(doc, '1-4');
		const limit = byId(doc, '1');

		// act
		for (const el of findPreviousNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
	});

	test('row+descend (2)', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: '1' },
				div({ id: '1-1' }, div({ id: '1-1-1' })),
				div({ id: '1-2' }, div({ id: '1-2-1' })),
				div({ id: '1-3' }, div({ id: '1-3-1' }, div({ id: '1-3-1-1' }), div({ id: '1-3-1-2' }))),
				div({ id: '1-4' }, div({ id: '1-4-1' }))
			)
		);
		const visited = [];
		const start = byId(doc, '1-4');
		const limit = byId(doc, '1');

		// act
		for (const el of findPreviousNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-3-1-2', '1-3-1-1', '1-3-1', '1-3', '1-2-1', '1-2', '1-1-1', '1-1']);
	});

	test('row+ascend (1)', () => {
		// arrange
		const doc = makeRoot(
			div(
				{ id: 'a' },
				div(
					{ id: '1' },
					div({ id: '1-1' }),
					div({ id: '1-2' }),
					div({ id: '1-3' }),
					div({ id: '1-4' })
				)
			)
		);
		const visited = [];
		const start = byId(doc, '1-4');
		const limit = byId(doc, 'a');

		// act
		for (const el of findPreviousNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['1-3', '1-2', '1-1', '1']);
	});

	test('row+ascend (2) - go up to parent and visit its previous sibs', () => {
		// arrange
		const doc = makeRoot(
			div({ id: 'a' }, div({ id: '1' }), div({ id: '2' }), div({ id: '3' }, div({ id: '3-1' })))
		);
		const visited = [];
		const start = byId(doc, '3-1');
		const limit = byId(doc, 'a');

		// act
		for (const el of findPreviousNode(start, limit)) {
			visited.push((el as HTMLElement).id);
		}

		// assert
		expect(visited).toEqual(['3', '2', '1']);
	});

	describe('regressions - refactor these or delete?', () => {
		test('regression case 1', () => {
			// arrange
			const doc = makeRoot(
				div(
					{ id: '1' },
					div({ id: '2' }),
					div({ id: '3' }),
					div({ id: '4' }, div({ id: '4-1' }), div({ id: '4-2' }))
				)
			);
			const visited = [];
			const start = byId(doc, '4-2');
			const limit = byId(doc, '1');

			// act
			for (const el of findPreviousNode(start, limit)) {
				visited.push((el as HTMLElement).id);
			}

			// assert
			expect(visited).toEqual(['4-1', '4', '3', '2']);
		});

		test('regression case 2', () => {
			// arrange
			const doc = makeRoot(
				div(
					{ id: '1' },
					div({ id: '2' }, div({ id: '2-1' })),
					div({ id: '3' }, div({ id: '3-1' })),
					div({ id: '4' }, div({ id: '4-1' }))
				)
			);
			const visited = [];
			const start = byId(doc, '4-1');
			const limit = byId(doc, '1');

			// act
			for (const el of findPreviousNode(start, limit)) {
				visited.push((el as HTMLElement).id);
			}

			// assert
			expect(visited).toEqual(['4', '3-1', '3', '2-1', '2']);
		});
	});
});
