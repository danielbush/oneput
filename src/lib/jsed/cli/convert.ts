import { Command } from 'commander';
import { convert } from '../lib/convert.js';
import * as fs from 'fs';

const program = new Command();
program.name('convert').description('Convert 2br markdown to 2br html');
program.argument('<pathtofile>', 'markdown file to convert').action((fileName: string) => {
	if (!fs.existsSync(fileName)) {
		console.error(`File "${fileName}" doesn't exist!`);
		process.exit(1);
	}
	const markdown = fs.readFileSync(fileName, 'utf-8');
	process.stdout.write(convert(markdown, fileName));
});

program.parse();
