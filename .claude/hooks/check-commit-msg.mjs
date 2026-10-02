// Claude Code PreToolUse hook (Bash). Blocks `git commit` calls whose message
// breaks the convention in README.md "Commit messages". Exit 2 = block; stderr goes to Claude.
import { readFileSync } from 'node:fs';

const TYPES = 'scaffold|feat|fix|docs|refactor|test|chore|style|perf|build|ci';
const SUBJECT = new RegExp(`^(${TYPES})(\\([a-z0-9-]+\\))?!?: [A-Z]`);
const PASS_THROUGH = /^(Merge |Revert "|fixup! |squash! |amend! )/;

const cmd = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
if (!/\bgit\b[\s\S]*\bcommit\b/.test(cmd)) process.exit(0);

// Find the message: a heredoc (Claude's usual form), else the -m/--message values.
function extractMessage(c) {
  const heredoc = c.match(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n\s*\2\s*(?:\n|$|\))/);
  if (heredoc) return heredoc[3];
  const parts = [];
  const re = /(?:\s-[a-zA-Z]*m|--message)(?:\s+|=)(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))/g;
  for (const m of c.matchAll(re)) parts.push(m[1]?.replace(/\\(.)/g, '$1') ?? m[2] ?? m[3]);
  return parts.length ? parts.join('\n\n') : null;
}

function problem(msg) {
  const lines = msg
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => !l.startsWith('#'));
  while (lines.length && !lines[0].trim()) lines.shift();
  const [subject = '', line2 = ''] = lines;
  if (PASS_THROUGH.test(subject)) return null;
  if (!SUBJECT.test(subject))
    return 'subject must be "<type>[(scope)]: Summary" with a capitalised summary';
  if (subject.endsWith('.')) return 'subject must not end with a period';
  if (subject.length > 72) return `subject is ${subject.length} chars (max 72)`;
  if (line2.trim()) return 'leave a blank line between the subject and the body';
  return null;
}

const msg = extractMessage(cmd);
const err = msg === null ? null : problem(msg); // no inline message (editor, -F, --no-edit): allow
if (err) {
  console.error(
    `Commit message rejected: ${err}.\n` +
      `Format: "<type>[(scope)]: Summary" (imperative, capitalised, no trailing period, max 72 chars), ` +
      `blank line before any body. Types: ${TYPES.replaceAll('|', ', ')}.`,
  );
  process.exit(2);
}
