import { describe, it, expect } from 'vitest';
import { convertMd, convert } from '../convert.js';

describe('convert', () => {
	describe('convert', () => {
		it('should return a filled-in template', () => {
			// act
			const content = convertMd('# test');
			const title = 'the title';
			const description = 'the description';
			const template = convert(content, title, description);

			// assert
			expect(template).toMatchSnapshot();
		});
	});

	describe('convertMd', () => {
		it('should convert a title', () => {
			// act
			const md = convertMd('# test');

			// assert
			expect(md).toMatchSnapshot();
		});

		it('should convert a title outline', () => {
			// act
			const md = convertMd('# level 1\n\nword\n\n## level 2');

			// assert
			expect(md).toMatchSnapshot();
		});

		it('should handle katex', () => {
			// act
			const md = convertMd('# level 1\n\nword $X \\beta = y + \\epsilon$\n\n## level 2');

			// assert
			expect(md).toMatchSnapshot();
		});
	});
});
