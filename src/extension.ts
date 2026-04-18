import * as vscode from 'vscode';
import { validateGraphQL, DiagnosticEntry } from './validator';
import { validateWorkspace } from './workspace-validator';

const GRAPHQL_SELECTOR = ['graphql'];
let diagnosticCollection: vscode.DiagnosticCollection;
let debounceTimer: NodeJS.Timeout | undefined;

const errorDecorationType = vscode.window.createTextEditorDecorationType({});
const decorationMap = new Map<string, vscode.DecorationOptions[]>();

export function activate(context: vscode.ExtensionContext) {
  try {
    console.log('graphql-ly: extension activated');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('graphql-ly');
    context.subscriptions.push(diagnosticCollection, errorDecorationType);

    // Validate already-open documents
    vscode.workspace.textDocuments.forEach(doc => safeLint(doc));

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(doc => safeLint(doc)),
      vscode.workspace.onDidChangeTextDocument(e => safeLint(e.document)),
      vscode.workspace.onDidSaveTextDocument(doc => safeLint(doc)),
      vscode.workspace.onDidCloseTextDocument(doc => {
        diagnosticCollection.delete(doc.uri);
        decorationMap.delete(doc.uri.toString());
      }),
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) { applyDecorations(editor); }
      }),
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('graphql-ly.validationMode')) { revalidateAll(); }
      })
    );
  } catch (e: any) {
    console.error('graphql-ly: activation failed:', e?.message, e?.stack);
  }
}

function safeLint(doc: vscode.TextDocument): void {
  try {
    lintDocument(doc);
  } catch (e: any) {
    console.error('graphql-ly: lint error:', e?.message, e?.stack);
  }
}

function isGraphQL(doc: vscode.TextDocument): boolean {
  return GRAPHQL_SELECTOR.includes(doc.languageId) ||
    doc.fileName.endsWith('.graphql') ||
    doc.fileName.endsWith('.gql');
}

function getMode(): string {
  return vscode.workspace.getConfiguration('graphql-ly').get('validationMode', 'single');
}

function lintDocument(doc: vscode.TextDocument): void {
  if (!isGraphQL(doc)) { return; }
  console.log(`graphql-ly: validating ${doc.fileName} (lang=${doc.languageId}, mode=${getMode()})`);

  if (getMode() === 'multi') {
    debouncedWorkspaceValidation();
    return;
  }

  const entries = validateGraphQL(doc.getText());
  console.log(`graphql-ly: found ${entries.length} issue(s) in ${doc.fileName}`);
  publishDiagnostics(doc.uri, entries);
}

function publishDiagnostics(uri: vscode.Uri, entries: DiagnosticEntry[]): void {
  const diagnostics = entries.map(e => {
    const range = new vscode.Range(e.line, e.column, e.endLine, e.endColumn);
    const severity = e.severity === 'error'
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
    const diag = new vscode.Diagnostic(range, e.message, severity);
    diag.source = 'graphql-ly';
    return diag;
  });
  diagnosticCollection.set(uri, diagnostics);

  const decos: vscode.DecorationOptions[] = entries.map(e => ({
    range: new vscode.Range(e.line, Number.MAX_SAFE_INTEGER, e.line, Number.MAX_SAFE_INTEGER),
    renderOptions: {
      after: {
        contentText: `  ← ${e.message}`,
        color: new vscode.ThemeColor('editorError.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 1em',
      }
    }
  }));
  decorationMap.set(uri.toString(), decos);

  const editor = vscode.window.visibleTextEditors.find(ed => ed.document.uri.toString() === uri.toString());
  if (editor) { editor.setDecorations(errorDecorationType, decos); }
}

function applyDecorations(editor: vscode.TextEditor): void {
  const decos = decorationMap.get(editor.document.uri.toString()) ?? [];
  editor.setDecorations(errorDecorationType, decos);
}

function debouncedWorkspaceValidation(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); }
  debounceTimer = setTimeout(() => runWorkspaceValidation(), 300);
}

async function runWorkspaceValidation(): Promise<void> {
  const results = await validateWorkspace();
  diagnosticCollection.clear();
  for (const editor of vscode.window.visibleTextEditors) {
    editor.setDecorations(errorDecorationType, []);
  }
  decorationMap.clear();
  for (const [uriStr, entries] of results) {
    publishDiagnostics(vscode.Uri.parse(uriStr), entries);
  }
}

function revalidateAll(): void {
  diagnosticCollection.clear();
  decorationMap.clear();
  for (const editor of vscode.window.visibleTextEditors) {
    editor.setDecorations(errorDecorationType, []);
  }
  if (getMode() === 'multi') {
    runWorkspaceValidation();
  } else {
    vscode.workspace.textDocuments.forEach(doc => safeLint(doc));
  }
}

export function deactivate() {}
