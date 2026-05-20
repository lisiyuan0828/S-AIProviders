/**
 * Tiny argv parser — purposely zero-dep.
 *
 *   --flag             → { flag: true }
 *   --key value        → { key: 'value' }
 *   --key=value        → { key: 'value' }
 *   -k value           → same as --k value (single-letter alias up to caller)
 *   positional         → returned in `_`
 */

export interface ParsedArgs {
  _: string[];
  [k: string]: string | boolean | string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok.startsWith('--')) {
      const eq = tok.indexOf('=');
      if (eq >= 0) {
        const k = tok.slice(2, eq);
        const v = tok.slice(eq + 1);
        out[k] = v;
        continue;
      }
      const k = tok.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        out[k] = next;
        i++;
      } else {
        out[k] = true;
      }
    } else if (tok.startsWith('-') && tok.length > 1) {
      const k = tok.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        out[k] = next;
        i++;
      } else {
        out[k] = true;
      }
    } else {
      (out._ as string[]).push(tok);
    }
  }
  return out;
}

/** Read a string flag with possible aliases. Returns undefined if none set. */
export function getStr(args: ParsedArgs, names: string[]): string | undefined {
  for (const n of names) {
    const v = args[n];
    if (typeof v === 'string') return v;
  }
  return undefined;
}

/** Read a number flag with possible aliases. */
export function getNum(args: ParsedArgs, names: string[]): number | undefined {
  const s = getStr(args, names);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Read a boolean flag with possible aliases. */
export function getBool(args: ParsedArgs, names: string[]): boolean {
  for (const n of names) {
    if (args[n] === true) return true;
  }
  return false;
}
