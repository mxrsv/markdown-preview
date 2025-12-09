import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './providers/MarkdownEditorProvider';

export function activate(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(editorProvider, openPreviewCommand);
}

export function deactivate() {
  // Cleanup handled by subscriptions
}
