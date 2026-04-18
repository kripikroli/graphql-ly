import * as vscode from 'vscode';
import { buildSchema, validateSchema, GraphQLError } from 'graphql';
import { APPSYNC_DIRECTIVES, APPSYNC_DIRECTIVES_LINE_COUNT } from './appsync-directives';
import { DiagnosticEntry } from './validator';

interface FileSegment {
  uri: vscode.Uri;
  startLine: number; // line offset in merged content (after directives)
  lineCount: number;
}

export async function validateWorkspace(): Promise<Map<string, DiagnosticEntry[]>> {
  const results = new Map<string, DiagnosticEntry[]>();
  const files = await vscode.workspace.findFiles('**/*.{graphql,gql}');
  if (files.length === 0) { return results; }

  const segments: FileSegment[] = [];
  const contents: string[] = [];
  let currentLine = 0;

  for (const uri of files) {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(bytes).toString('utf-8');
    const lineCount = text.split('\n').length;
    segments.push({ uri, startLine: currentLine, lineCount });
    contents.push(text);
    currentLine += lineCount;
  }

  const merged = APPSYNC_DIRECTIVES + contents.join('\n');
  const directiveOffset = APPSYNC_DIRECTIVES_LINE_COUNT - 1;

  // Initialize empty arrays for all files
  for (const seg of segments) {
    results.set(seg.uri.toString(), []);
  }

  try {
    const schema = buildSchema(merged);
    const errors = validateSchema(schema);
    for (const err of errors) {
      mapErrorToFile(err, segments, directiveOffset, results);
    }
  } catch (e) {
    if (e instanceof GraphQLError) {
      mapErrorToFile(e, segments, directiveOffset, results);
    }
  }

  return results;
}

function mapErrorToFile(
  error: GraphQLError,
  segments: FileSegment[],
  directiveOffset: number,
  results: Map<string, DiagnosticEntry[]>
): void {
  const loc = error.locations?.[0];
  if (!loc) { return; }

  const globalLine = loc.line - 1 - directiveOffset;
  const segment = segments.find(
    (s, i) => globalLine >= s.startLine &&
      globalLine < s.startLine + s.lineCount + (i < segments.length - 1 ? 0 : 1)
  );
  if (!segment) { return; }

  const localLine = globalLine - segment.startLine;
  const column = loc.column - 1;
  const key = segment.uri.toString();
  const arr = results.get(key) ?? [];
  arr.push({
    message: error.message,
    line: localLine,
    column,
    endLine: localLine,
    endColumn: column + 1,
    severity: 'error',
  });
  results.set(key, arr);
}
