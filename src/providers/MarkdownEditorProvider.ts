import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { PromptService } from "../services/PromptService";

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "markdownLexicalPreview.editor";
  private cachedStyles: string | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context.extensionUri);
    return vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "out", "webview"),
      ],
    };

    // Get relative path for the document
    const relativePath = this.getRelativePath(document.uri);

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      relativePath,
    );

    // Send content after a short delay (fallback)
    setTimeout(() => {
      this.sendContent(webviewPanel.webview, document.getText());
    }, 100);

    // Handle messages from webview
    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "ready":
            this.sendContent(webviewPanel.webview, document.getText());
            break;
          case "openFile":
            this.openFile(message.filePath, message.startLine, message.endLine);
            break;
          case "executeInTerminal":
            this.executeInTerminal(message.filePath);
            break;
          case "copyPrompt":
            this.copyPromptToClipboard(message.filePath);
            break;
          case "copyReviewPrompt":
            this.copyReviewPromptToClipboard(message.filePath);
            break;
          case "executeReview":
            this.executeReviewInTerminal(message.filePath);
            break;
          case "switchToTextEditor":
            this.switchToTextEditor(document.uri, webviewPanel);
            break;
          case "deleteFile":
            this.deleteFile(document.uri, webviewPanel);
            break;
          case "toggleCheckbox":
            this.toggleCheckbox(
              document,
              message.lineNumber,
              message.newChecked,
            );
            break;
          case "copyText":
            this.copyTextToClipboard(message.text);
            break;
          case "togglePreview":
            vscode.commands.executeCommand(
              "markdown-lexical-preview.togglePreview",
              document.uri,
            );
            break;
        }
      },
    );

    // Push font-size changes to webview live
    const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("markdownLexicalPreview.fontSize")) {
          webviewPanel.webview.postMessage({
            type: "settings",
            fontSize: this.getFontSize(),
          });
        }
      },
    );

    // Debounce timer for document changes
    let debounceTimer: NodeJS.Timeout | undefined;

    // Update webview when document changes (with debounce)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          // Clear existing timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          // Debounce updates to prevent flooding
          debounceTimer = setTimeout(() => {
            this.sendContent(webviewPanel.webview, document.getText());
          }, 150); // 150ms debounce
        }
      },
    );

    webviewPanel.onDidDispose(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      changeDocumentSubscription.dispose();
      configChangeSubscription.dispose();
      messageHandler.dispose();
    });
  }

  private async copyTextToClipboard(text: unknown): Promise<void> {
    if (typeof text !== "string" || text.length === 0) return;
    await vscode.env.clipboard.writeText(text);
    vscode.window.setStatusBarMessage("$(check) Copied to clipboard", 1500);
  }

  private getFontSize(): number {
    const config = vscode.workspace.getConfiguration("markdownLexicalPreview");
    const raw = config.get<number>("fontSize", 14);
    return Math.max(8, Math.min(48, Math.round(raw)));
  }

  private async toggleCheckbox(
    document: vscode.TextDocument,
    lineNumber: number,
    newChecked: boolean,
  ): Promise<void> {
    if (
      typeof lineNumber !== "number" ||
      lineNumber < 0 ||
      lineNumber >= document.lineCount
    ) {
      vscode.window.showWarningMessage(
        "Cannot toggle checkbox: line is out of range (document may have changed).",
      );
      return;
    }

    // Align with Lexical CHECK_LIST regex: optional dash, optional inner char.
    // Capture groups: (1) prefix up to and including `[`, (2) the inner char
    // (space | x | X | empty), (3) the closing `]`.
    const line = document.lineAt(lineNumber);
    const match = line.text.match(/^(\s*(?:-\s)?\s?\[)([ xX]?)(\])/i);
    if (!match) {
      vscode.window.showWarningMessage(
        "Cannot toggle checkbox: source line is no longer a task item.",
      );
      return;
    }

    const charIndex = match[1].length;
    const innerLength = match[2].length;
    const newChar = newChecked ? "x" : " ";
    // If brackets were empty (`[]`), insert a char rather than replace.
    const range = new vscode.Range(
      lineNumber,
      charIndex,
      lineNumber,
      charIndex + innerLength,
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, newChar);

    try {
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        vscode.window.showErrorMessage(
          "Failed to toggle checkbox: edit was rejected (file may be read-only).",
        );
        return;
      }
      // Persist the change immediately so the file reflects the UI state
      // without waiting for the user's `files.autoSave` setting. `save()`
      // is a no-op when the document is not dirty, per the VS Code API,
      // so calling unconditionally avoids races with autoSave clearing
      // `isDirty` between applyEdit and our check.
      const saved = await document.save();
      if (!saved && document.isDirty) {
        vscode.window.showWarningMessage(
          "Checkbox toggled but file could not be saved automatically. Please save manually.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to toggle checkbox: ${message}`);
    }
  }

  private sendContent(webview: vscode.Webview, content: string): void {
    webview.postMessage({
      type: "update",
      content: content,
    });
  }

  private getRelativePath(uri: vscode.Uri): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const filePath = uri.fsPath;
      if (filePath.startsWith(workspaceRoot)) {
        return filePath.substring(workspaceRoot.length + 1).replace(/\\/g, "/");
      }
    }
    return uri.fsPath;
  }

  private executeInTerminal(filePath: string): void {
    const prompt = PromptService.getExecutePrompt(filePath);
    const command = `claude "${prompt}"`;

    const terminal = vscode.window.createTerminal("Claude Execute");
    terminal.show();
    terminal.sendText(command);
  }

  private async copyPromptToClipboard(filePath: string): Promise<void> {
    const prompt = PromptService.getExecutePrompt(filePath);

    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage("Prompt copied to clipboard!");
  }

  private async copyReviewPromptToClipboard(filePath: string): Promise<void> {
    const prompt = PromptService.getReviewPrompt(filePath);
    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage("Review prompt copied to clipboard!");
  }

  private executeReviewInTerminal(filePath: string): void {
    const prompt = PromptService.getReviewPrompt(filePath);
    const command = `claude "${prompt}"`;

    const terminal = vscode.window.createTerminal("Claude Review");
    terminal.show();
    terminal.sendText(command);
  }

  private async switchToTextEditor(
    uri: vscode.Uri,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      await vscode.commands.executeCommand("vscode.openWith", uri, "default", {
        preview: false,
      });
      panel.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open editor: ${error}`);
    }
  }

  private async deleteFile(
    uri: vscode.Uri,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    const filesConfig = vscode.workspace.getConfiguration("files");
    const useTrash = filesConfig.get<boolean>("enableTrash", true);

    const confirmLabel = useTrash ? "Move to Trash" : "Delete Permanently";
    const detail = useTrash
      ? `'${fileName}' will be moved to the trash.`
      : `'${fileName}' will be permanently deleted. This action is irreversible.`;

    const choice = await vscode.window.showWarningMessage(
      `Are you sure you want to delete '${fileName}'?`,
      { modal: true, detail },
      confirmLabel,
    );

    if (choice !== confirmLabel) return;

    try {
      panel.dispose();
      await vscode.workspace.fs.delete(uri, { useTrash, recursive: false });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete file: ${error}`);
    }
  }

  private async openFile(
    filePath: string,
    startLine?: number,
    endLine?: number,
  ): Promise<void> {
    try {
      // Resolve relative path from workspace
      const workspaceFolders = vscode.workspace.workspaceFolders;
      let fullPath: vscode.Uri;

      // Normalize path: remove duplicate segments (e.g., .cursor/plans/.cursor/plans/file.md)
      let normalizedPath = filePath;
      const segments = filePath.split("/");
      for (let i = 1; i < segments.length; i++) {
        const prefix = segments.slice(0, i).join("/");
        const suffix = segments.slice(i).join("/");
        if (suffix.startsWith(prefix + "/")) {
          normalizedPath = suffix;
          break;
        }
      }

      if (path.isAbsolute(normalizedPath)) {
        fullPath = vscode.Uri.file(normalizedPath);
      } else if (workspaceFolders && workspaceFolders.length > 0) {
        fullPath = vscode.Uri.joinPath(workspaceFolders[0].uri, normalizedPath);
      } else {
        vscode.window.showErrorMessage(`Cannot resolve path: ${filePath}`);
        return;
      }

      // Check if file exists
      try {
        await vscode.workspace.fs.stat(fullPath);
      } catch {
        vscode.window.showErrorMessage(`File not found: ${filePath}`);
        return;
      }

      // Check if it's a markdown file - open directly with custom editor
      const isMarkdown =
        fullPath.fsPath.toLowerCase().endsWith(".md") ||
        fullPath.fsPath.toLowerCase().endsWith(".markdown");

      if (isMarkdown) {
        // Open directly with custom editor - no text editor involved
        await vscode.commands.executeCommand(
          "vscode.openWith",
          fullPath,
          MarkdownEditorProvider.viewType,
        );
        return;
      }

      // For non-markdown files, open normally
      const doc = await vscode.workspace.openTextDocument(fullPath);
      const editor = await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });

      // Select lines if specified
      if (startLine !== undefined) {
        const start = Math.max(0, startLine - 1);
        const end = endLine !== undefined ? endLine - 1 : start;

        const startPos = new vscode.Position(start, 0);
        const endPos = new vscode.Position(
          end,
          doc.lineAt(Math.min(end, doc.lineCount - 1)).text.length,
        );

        editor.selection = new vscode.Selection(startPos, endPos);
        editor.revealRange(
          new vscode.Range(startPos, endPos),
          vscode.TextEditorRevealType.InCenter,
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error opening file: ${error}`);
    }
  }

  private getStyles(): string {
    const isDev = process.env.NODE_ENV !== "production";
    if (this.cachedStyles && !isDev) {
      return this.cachedStyles;
    }

    try {
      const stylePath = path.join(
        this.extensionUri.fsPath,
        "src",
        "webview",
        "styles.css",
      );
      const styles = fs.readFileSync(stylePath, "utf8");
      if (!isDev) this.cachedStyles = styles;
      return styles;
    } catch {
      try {
        const stylePath = path.join(
          this.extensionUri.fsPath,
          "out",
          "webview",
          "styles.css",
        );
        this.cachedStyles = fs.readFileSync(stylePath, "utf8");
        return this.cachedStyles;
      } catch {
        return "/* styles not found */";
      }
    }
  }

  private getWebviewContent(
    webview: vscode.Webview,
    relativePath: string,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "out", "webview", "webview.js"),
    );

    const nonce = this.getNonce();
    const styles = this.getStyles();
    const fontSize = this.getFontSize();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Markdown Preview</title>
  <style>${styles}</style>
</head>
<body style="--preview-font-size: ${fontSize}px">
  <div id="toolbar">
    <div class="toolbar-row">
      <div class="tb-split">
        <button id="tb-main" class="tb-main" data-mode="path" data-filepath="${relativePath}" title="Copy relative path">
          <span class="tb-label">Copy path</span>
          <span class="tb-kbd" aria-hidden="true">⌘↵</span>
        </button>
        <button id="tb-arrow" class="tb-arrow" aria-label="Options" aria-haspopup="menu" aria-expanded="false">▾</button>
        <ul id="tb-menu" class="tb-menu" role="menu" hidden>
          <li class="tb-menu-item" role="menuitem" tabindex="0" data-action="path">Copy</li>
          <li class="tb-menu-item" role="menuitem" tabindex="0" data-action="comment">Comment</li>
        </ul>
      </div>
    </div>
    <div id="tb-comment-panel" hidden>
      <textarea id="tb-comment-input" rows="3" placeholder="Type your comment..."></textarea>
      <button id="tb-comment-copy" class="tb-comment-copy">Copy</button>
    </div>
  </div>
  <div id="editor-root" contenteditable="false"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
