import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './providers/MarkdownEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  // Track URIs being redirected to prevent loops
  const redirectingUris = new Set<string>();

  // Register Custom Editor Provider
  const editorProvider = MarkdownEditorProvider.register(context);

  // Register command to open preview as custom editor
  const openPreviewCommand = vscode.commands.registerCommand(
    'markdown-lexical-preview.openPreview',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'markdown') {
        // Open with custom editor
        await vscode.commands.executeCommand(
          'vscode.openWith',
          editor.document.uri,
          MarkdownEditorProvider.viewType
        );
      } else {
        vscode.window.showWarningMessage('Please open a Markdown file first.');
      }
    }
  );

  // Auto-redirect markdown files opened in text editor to custom editor
  // This handles cases like: Ctrl+click on imports, Go to Definition, etc.
  const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!editor) return;

    const doc = editor.document;
    if (doc.languageId !== 'markdown') return;

    const uriString = doc.uri.toString();

    // Prevent redirect loop
    if (redirectingUris.has(uriString)) return;

    // Check if auto-preview is enabled
    const config = vscode.workspace.getConfiguration('markdownLexicalPreview');
    const autoPreview = config.get<boolean>('autoPreview', true);
    if (!autoPreview) return;

    // Mark as redirecting
    redirectingUris.add(uriString);

    try {
      // Store the URI before closing
      const docUri = doc.uri;

      // Close the text editor and open custom editor
      // Use reopen command which handles this cleanly
      await vscode.commands.executeCommand(
        'vscode.openWith',
        docUri,
        MarkdownEditorProvider.viewType
      );

      // Close the text editor tab (it will be behind the custom editor)
      // Find and close only the text editor, not the custom editor
      const tabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
      for (const tab of tabs) {
        if (tab.input instanceof vscode.TabInputText &&
            tab.input.uri.toString() === uriString) {
          await vscode.window.tabGroups.close(tab);
          break;
        }
      }
    } finally {
      // Clear redirect flag after a delay
      setTimeout(() => redirectingUris.delete(uriString), 1000);
    }
  });

  context.subscriptions.push(editorProvider, openPreviewCommand, onDidChangeActiveEditor);
}

export function deactivate() {
  // Cleanup handled by subscriptions
}
