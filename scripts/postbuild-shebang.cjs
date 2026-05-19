#!/usr/bin/env node
/**
 * Post-build helper: ensure the bin entry has a node shebang and is +x.
 * Usage: node scripts/postbuild-shebang.cjs <relative-path-to-bin-js>
 *
 * tsc strips the `#!/usr/bin/env node` line by default when emitting modules,
 * so we re-prepend it after compilation.
 */
const fs = require('node:fs');
const path = require('node:path');

const target = process.argv[2];
if (!target) {
  console.error('postbuild-shebang: missing target path');
  process.exit(2);
}
const abs = path.resolve(process.cwd(), target);
if (!fs.existsSync(abs)) {
  console.error(`postbuild-shebang: file not found: ${abs}`);
  process.exit(1);
}

const SHEBANG = '#!/usr/bin/env node\n';
const original = fs.readFileSync(abs, 'utf8');
if (!original.startsWith('#!')) {
  fs.writeFileSync(abs, SHEBANG + original, 'utf8');
}
fs.chmodSync(abs, 0o755);
console.log(`postbuild-shebang: ${path.relative(process.cwd(), abs)} ready (+x, shebang ok)`);
