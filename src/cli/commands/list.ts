/**
 * `list-presets` subcommand — dump the built-in preset catalogue.
 */

import { BUILTIN_PRESETS } from '../../index.js';
import { type ParsedArgs, getBool, getStr } from '../args.js';

export function runList(args: ParsedArgs): number {
  const kindFilter = getStr(args, ['kind']);
  const asJson = getBool(args, ['json']);
  const list = BUILTIN_PRESETS.filter((p) => {
    if (!kindFilter) return true;
    const k = p.kind ?? 'chat';
    return k === kindFilter;
  });

  if (asJson) {
    process.stdout.write(`${JSON.stringify(list, null, 2)}\n`);
    return 0;
  }

  for (const p of list) {
    const tag = (p.kind ?? 'chat').padEnd(5);
    const rec = p.recommended ? ' ★' : '';
    console.log(`[${tag}] ${p.id.padEnd(20)} ${p.displayName}${rec}`);
    console.log(`        protocol: ${p.protocol}`);
    console.log(`        baseURL : ${p.defaultBaseURL}`);
    if (p.description) console.log(`        ${p.description}`);
    const models = p.builtinModels.map((m) => m.id).join(', ');
    console.log(`        models  : ${models}`);
    console.log('');
  }
  return 0;
}
