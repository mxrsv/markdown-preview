import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { PromptService } from "../services/PromptService";
import { manualEditUris } from "../extension";

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = "markdownLexicalPreview.editor";
    private cachedStyles: string | undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MarkdownEditorProvider(context.extensionUri);
        return vscode.window.registerCustomEditorProvider(MarkdownEditorProvider.viewType, provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
            supportsMultipleEditorsPerDocument: false,
        });
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "out", "webview")],
        };

        // Get relative path for the document
        const relativePath = this.getRelativePath(document.uri);

        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview, relativePath);

        // Send content after a short delay (fallback)
        setTimeout(() => {
            this.sendContent(webviewPanel.webview, document.getText());
        }, 100);

        // Handle messages from webview
        const messageHandler = webviewPanel.webview.onDidReceiveMessage((message) => {
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
            }
        });

        // Debounce timer for document changes
        let debounceTimer: NodeJS.Timeout | undefined;

        // Update webview when document changes (with debounce)
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
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
        });

        webviewPanel.onDidDispose(() => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            changeDocumentSubscription.dispose();
            messageHandler.dispose();
        });
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

    private async switchToTextEditor(uri: vscode.Uri, panel: vscode.WebviewPanel): Promise<void> {
        try {
            // Mark URI to bypass auto-redirect
            manualEditUris.add(uri.toString());

            // Dispose the preview panel first
            panel.dispose();

            // Force open with text editor (not custom editor)
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, {
                preview: false,
                viewColumn: vscode.ViewColumn.Active
            });
        } catch (error) {
            // Remove from bypass set if failed
            manualEditUris.delete(uri.toString());
            vscode.window.showErrorMessage(`Failed to open editor: ${error}`);
        }
    }

    private async openFile(filePath: string, startLine?: number, endLine?: number): Promise<void> {
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
            const isMarkdown = fullPath.fsPath.toLowerCase().endsWith('.md') ||
                               fullPath.fsPath.toLowerCase().endsWith('.markdown');

            if (isMarkdown) {
                // Open directly with custom editor - no text editor involved
                await vscode.commands.executeCommand(
                    'vscode.openWith',
                    fullPath,
                    MarkdownEditorProvider.viewType
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
                const endPos = new vscode.Position(end, doc.lineAt(Math.min(end, doc.lineCount - 1)).text.length);

                editor.selection = new vscode.Selection(startPos, endPos);
                editor.revealRange(new vscode.Range(startPos, endPos), vscode.TextEditorRevealType.InCenter);
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
            const stylePath = path.join(this.extensionUri.fsPath, "src", "webview", "styles.css");
            const styles = fs.readFileSync(stylePath, "utf8");
            if (!isDev) this.cachedStyles = styles;
            return styles;
        } catch {
            try {
                const stylePath = path.join(this.extensionUri.fsPath, "out", "webview", "styles.css");
                this.cachedStyles = fs.readFileSync(stylePath, "utf8");
                return this.cachedStyles;
            } catch {
                return "/* styles not found */";
            }
        }
    }

    private getWebviewContent(webview: vscode.Webview, relativePath: string): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "out", "webview", "webview.js"));

        const nonce = this.getNonce();
        const styles = this.getStyles();

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Markdown Preview</title>
  <style>${styles}</style>
</head>
<body>
  <div id="toolbar">
    <div class="toolbar-select-wrapper" data-filepath="${relativePath}">
      <select id="review-select" class="toolbar-select">
        <option value="" disabled selected>Review</option>
        <option value="copy">📋 Copy Review Prompt</option>
        <option value="run">▶ Review Now</option>
      </select>
    </div>
    <button id="copy-prompt-btn" class="toolbar-btn secondary" data-filepath="${relativePath}">
      <span class="btn-icon">📋</span>
      <span class="btn-text">Copy Prompt</span>
    </button>
    <button id="execute-btn" class="toolbar-btn" data-filepath="${relativePath}">
      <span class="btn-icon">▶</span>
      <span class="btn-text">Execute Plan</span>
    </button>
  </div>
  <div id="editor-root" contenteditable="false"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
