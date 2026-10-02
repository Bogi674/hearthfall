// Fails the offline build if the output is not one self contained index.html.
import { readdirSync, readFileSync } from 'node:fs';

const dir = 'dist-offline';
const files = readdirSync(dir, { recursive: true });
if (files.length !== 1 || files[0] !== 'index.html') {
  console.error(`Offline build must contain only index.html. Found: ${files.join(', ')}`);
  process.exit(1);
}

const html = readFileSync(`${dir}/index.html`, 'utf8');
const external = html.match(/<(script|link|img)\b[^>]*\b(src|href)="(?!data:)[^"]*"/g);
if (external) {
  console.error(`Offline build references external files:\n${external.join('\n')}`);
  process.exit(1);
}

console.log(`Offline build OK: ${dir}/index.html (${Math.round(html.length / 1024)} kB)`);
