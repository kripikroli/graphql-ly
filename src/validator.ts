import { parse, buildSchema, validateSchema, GraphQLError } from 'graphql';
import { APPSYNC_DIRECTIVES } from './appsync-directives';

export interface DiagnosticEntry {
  message: string;
  line: number;   // 0-based
  column: number; // 0-based
  endLine: number;
  endColumn: number;
  severity: 'error' | 'warning';
}

// Count how many lines the directives prefix adds.
// The template literal has a leading \n so split gives one extra empty element.
const DIRECTIVE_LINE_OFFSET = APPSYNC_DIRECTIVES.split('\n').length - 1;

export function validateGraphQL(text: string): DiagnosticEntry[] {
  // Phase 1: Syntax check (on raw text, no offset needed)
  try {
    parse(text);
  } catch (e: any) {
    const loc = e?.locations?.[0];
    const line = loc ? loc.line - 1 : 0;
    const col = loc ? loc.column - 1 : 0;
    return [entry(e?.message ?? 'Parse error', line, col)];
  }

  // Phase 2: Schema validation on combined source
  const combined = APPSYNC_DIRECTIVES + text;
  let errors: readonly GraphQLError[];
  try {
    const schema = buildSchema(combined);
    errors = validateSchema(schema);
  } catch (e: any) {
    const line = resolveErrorLine(e, combined, text);
    return [entry(e?.message ?? 'Schema error', line.line, line.col)];
  }

  return errors.map(e => {
    const loc = resolveErrorLine(e, combined, text);
    return entry(e.message, loc.line, loc.col);
  });
}

function resolveErrorLine(error: any, combined: string, originalText: string): { line: number; col: number } {
  // Strategy 1: error.locations (relative to combined source)
  if (error.locations?.length) {
    const loc = error.locations[0];
    const line = loc.line - 1 - DIRECTIVE_LINE_OFFSET;
    if (line >= 0) { return { line, col: loc.column - 1 }; }
  }

  // Strategy 2: error.nodes with loc (relative to combined source)
  if (error.nodes?.length) {
    for (const node of error.nodes) {
      if (node.loc) {
        // Convert absolute offset in combined string to line number
        const absOffset = node.loc.start;
        const directivesLength = APPSYNC_DIRECTIVES.length;
        if (absOffset >= directivesLength) {
          // It's in the user's source text
          const posInOriginal = absOffset - directivesLength;
          const line = originalText.substring(0, posInOriginal).split('\n').length - 1;
          const lastNewline = originalText.lastIndexOf('\n', posInOriginal - 1);
          const col = posInOriginal - lastNewline - 1;
          return { line, col: Math.max(0, col) };
        }
      }
    }
  }

  // Strategy 3: Search original text for the referenced name (skip comments)
  const nameMatch = error.message?.match(/(?:Unknown type|Type|Field|Directive)\s+"([^"]+)"/);
  if (nameMatch) {
    const needle = nameMatch[1];
    const lines = originalText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('#')) { continue; }
      const idx = lines[i].indexOf(needle);
      if (idx !== -1) { return { line: i, col: idx }; }
    }
  }

  return { line: 0, col: 0 };
}

function entry(message: string, line: number, col: number): DiagnosticEntry {
  const safeLine = Math.max(0, line);
  const safeCol = Math.max(0, col);
  return {
    message,
    line: safeLine,
    column: safeCol,
    endLine: safeLine,
    endColumn: safeCol + 1,
    severity: 'error',
  };
}
