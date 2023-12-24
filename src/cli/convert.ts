import { convert } from '../lib/convert';
import * as fs from 'fs';

const fileName = process.argv[2];

if (!fileName) {
  console.error('You need to specify a file.');
  process.exit(1);
}
if (!fs.existsSync(fileName)) {
  console.error(`File "${fileName}" doesn't exist.`);
  process.exit(1);
}

const markdown = fs.readFileSync(fileName, 'utf-8');

process.stdout.write(convert(markdown, fileName));
