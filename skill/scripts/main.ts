#!/usr/bin/env -S npx tsx
/**
 * @s-aiproviders/skill — entry point.
 *
 * Subcommands:
 *   chat          stream a chat completion to stdout
 *   image         generate an image and save to disk
 *   list-presets  dump the built-in provider catalogue
 *
 * Run with: tsx skill/scripts/main.ts <cmd> [flags]
 *      or : bun  skill/scripts/main.ts <cmd> [flags]
 */

import { parseArgs } from './args';
import { runChat } from './commands/chat';
import { runImage } from './commands/image';
import { runList } from './commands/list';

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    printUsage();
    return cmd ? 0 : 1;
  }

  const args = parseArgs(rest);

  switch (cmd) {
    case 'chat':
      return runChat(args);
    case 'image':
      return runImage(args);
    case 'list-presets':
    case 'list':
      return runList(args);
    default:
      console.error(`Unknown subcommand: ${cmd}\n`);
      printUsage();
      return 2;
  }
}

function printUsage(): void {
  console.log(`S-AIProviders — unified AI provider CLI

Usage:
  tsx scripts/main.ts <command> [flags]

Commands:
  chat              Stream a chat completion (text)
  image             Generate an image (PNG)
  list-presets      List built-in providers
  help              Show this message

Common flags (chat & image):
  --provider <id>     Preset id (e.g. tokenplan, openai, anthropic, gemini, openai-image, hunyuan-image-tc3)
  --apikey  <key>     API key (Tencent: "SecretId:SecretKey")
  --baseurl <url>     Override preset's default base URL
  --model   <id>      Model id understood by the upstream
  --json              Emit machine-readable JSON instead of human output
  --verbose           Print resolution info to stderr

chat-only:
  --prompt   <text>   User prompt (or pipe via stdin)
  --promptfile <path> Read prompt from file
  --system   <text>   System message
  --temperature <n>
  --maxtokens   <n>

image-only:
  --prompt   <text>   Required
  --size     <WxH>    e.g. 1024x1024 (default), 1792x1024
  --output   <dir>    Output directory (default: ./output)
  --name     <base>   Output file base name (no extension)

list-presets:
  --kind chat|image
  --json

Configuration priority (highest → lowest):
  1. CLI flags
  2. ./.s-aiproviders/EXTEND.md   (project)
  3. ~/.s-aiproviders/EXTEND.md   (user)
  4. Environment variables
  5. Preset defaults

See SKILL.md for examples and EXTEND.md schema.
`);
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(`[s-aiproviders] fatal: ${(err as Error).message}`);
    process.exit(1);
  });
