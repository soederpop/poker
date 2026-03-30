import { z } from 'zod'
import type { Assistant, AGIContainer } from '@soederpop/luca/agi'

declare global {
	var assistant: Assistant
	var container: AGIContainer
}

const proc = () => container.feature('proc')
const fs = () => container.feature('fs')

// Patterns that enable command chaining, substitution, or injection at the shell level.
const SHELL_INJECTION_PATTERNS = [
	/;/,          // command chaining
	/&&/,         // logical AND chaining
	/\|\|/,       // logical OR chaining
	/\$\(/,       // command substitution $(...)
	/`/,          // backtick command substitution
	/\$\{/,       // variable expansion ${...}
	/\n/,         // newline injection
]

// Additional patterns for tools that should not use piping or redirection.
const PIPE_AND_REDIRECT_PATTERNS = [
	/\|/,         // piping
	/>\s*/,       // output redirection
	/<\(/,        // process substitution
]

/**
 * Validates that args don't contain shell injection metacharacters.
 * `strict` mode also blocks pipes and redirects (for tools like ls, cat).
 * `permissive` mode allows | and > since they're valid in regex patterns (for rg, sed, awk).
 */
function sanitizeArgs(args: string, command: string, mode: 'strict' | 'permissive' = 'strict'): string {
	const patterns = mode === 'strict'
		? [...SHELL_INJECTION_PATTERNS, ...PIPE_AND_REDIRECT_PATTERNS]
		: SHELL_INJECTION_PATTERNS

	for (const pattern of patterns) {
		if (pattern.test(args)) {
			throw new Error(
				`Refused to execute ${command}: args contain a disallowed shell metacharacter (matched ${pattern}). ` +
				`Only pass flags, patterns, and file paths — no command chaining or substitution.`
			)
		}
	}

	return args
}

export const schemas = {
	rg: z.object({
		args: z.string().describe('Arguments to pass to ripgrep, e.g. "TODO" --type ts -n'),
	}).describe('Search file contents using ripgrep (rg). Fast, recursive, respects .gitignore.'),

	ls: z.object({
		args: z.string().default('.').describe('Arguments to pass to ls, e.g. -la src/'),
	}).describe('List files and directories.'),

	cat: z.object({
		args: z.string().describe('Arguments to pass to cat, e.g. src/index.ts'),
	}).describe('Read file contents.'),

	sed: z.object({
		args: z.string().describe('Arguments to pass to sed, e.g. -n "10,20p" src/index.ts'),
	}).describe('Stream editor for filtering and transforming text.'),

	awk: z.object({
		args: z.string().describe('Arguments to pass to awk, e.g. \'{print $1}\' file.txt'),
	}).describe('Pattern scanning and text processing.'),

	writeFile: z.object({
		path: z.string().describe('File path relative to the project root, e.g. src/utils/helper.ts'),
		content: z.string().describe('The full content to write to the file'),
	}).describe('Write content to a file. Creates the file if it does not exist, overwrites if it does.'),

	pwd: z.object({}).describe('Print the current working directory.'),
}

export function rg({ args }: z.infer<typeof schemas.rg>): string {
	return proc().exec(`rg ${sanitizeArgs(args, 'rg', 'permissive')}`)
}

export function ls({ args }: z.infer<typeof schemas.ls>): string {
	return proc().exec(`ls ${sanitizeArgs(args, 'ls')}`)
}

export function cat({ args }: z.infer<typeof schemas.cat>): string {
	return proc().exec(`cat ${sanitizeArgs(args, 'cat')}`)
}

export function sed({ args }: z.infer<typeof schemas.sed>): string {
	return proc().exec(`sed ${sanitizeArgs(args, 'sed', 'permissive')}`)
}

export function awk({ args }: z.infer<typeof schemas.awk>): string {
	return proc().exec(`awk ${sanitizeArgs(args, 'awk', 'permissive')}`)
}

export async function writeFile({ path, content }: z.infer<typeof schemas.writeFile>): Promise<string> {
	await fs().writeFileAsync(path, content)
	return `Wrote ${content.length} bytes to ${path}`
}

export function pwd(): string {
	return proc().exec('pwd')
}
