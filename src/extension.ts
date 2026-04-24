import * as vscode from "vscode";
import { MarkdownEditorProvider } from "./providers/MarkdownEditorProvider";

export function activate(context: vscode.ExtensionContext) {
  const editorProvider = MarkdownEditorProvider.register(context);

  const openPreviewCommand = vscode.commands.registerCommand(
    "markdown-lexical-preview.openPreview",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "markdown") {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          editor.document.uri,
          MarkdownEditorProvider.viewType,
        );
      } else {
        vscode.window.showWarningMessage("Please open a Markdown file first.");
      }
    },
  );

  // Bidirectional toggle: text editor <-> custom preview, on the same Cmd+Shift+L.
  // The keybinding is gated by `when` clauses so each direction targets the right
  // active context (text editor vs. custom editor), but the user only needs one
  // shortcut.
  const togglePreviewCommand = vscode.commands.registerCommand(
    "markdown-lexical-preview.togglePreview",
    async (uri?: vscode.Uri) => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const tabInput = tab?.input as
        | { uri?: vscode.Uri; viewType?: string }
        | undefined;
      const isCustomPreview =
        tabInput?.viewType === MarkdownEditorProvider.viewType;

      if (isCustomPreview && tabInput?.uri) {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          tabInput.uri,
          "default",
          { preview: false },
        );
        return;
      }

      const targetUri =
        uri ??
        vscode.window.activeTextEditor?.document.uri ??
        (tabInput?.uri as vscode.Uri | undefined);

      if (!targetUri) {
        vscode.window.showWarningMessage("Please open a Markdown file first.");
        return;
      }

      await vscode.commands.executeCommand(
        "vscode.openWith",
        targetUri,
        MarkdownEditorProvider.viewType,
      );
    },
  );

  const autoPreviewListener = vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.languageId !== "markdown" || doc.uri.scheme !== "file") {
      return;
    }
    const autoPreview = vscode.workspace
      .getConfiguration("markdownLexicalPreview")
      .get<boolean>("autoPreview", true);
    if (!autoPreview) {
      return;
    }
    vscode.commands.executeCommand(
      "vscode.openWith",
      doc.uri,
      MarkdownEditorProvider.viewType,
    );
  });

  context.subscriptions.push(
    editorProvider,
    openPreviewCommand,
    togglePreviewCommand,
    autoPreviewListener,
  );
}

export function deactivate() {
  // Cleanup handled by subscriptions
}
