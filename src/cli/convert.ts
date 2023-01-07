import { convert } from '../convert/index';
import * as fs from 'fs';

const file = process.argv[2];

if (!file) {
  console.error('You need to specify a file.');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File "${file} doesn't exist.`);
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf-8');
const html = convert(content);
process.stdout.write(html);
// console.log(html);
