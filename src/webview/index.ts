import { createEditor, $getRoot, $createParagraphNode, $createTextNode, DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code';
import { LinkNode, AutoLinkNode, $createLinkNode } from '@lexical/link';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import {
  TableNode,
  TableRowNode,
  TableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates
} from '@lexical/table';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// Message queue for messages received before DOM is ready
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingMessages: any[] = [];
let isInitialized = false;

// Debounce state for message processing
let updateDebounceTimer: number | undefined;
let pendingContent: string | null = null;

// Set up message listener IMMEDIATELY to catch early messages
window.addEventListener('message', (event) => {
  const message = event.data;

  if (!isInitialized) {
    pendingMessages.push(message);
    return;
  }

  processMessage(message);
});

// Process a single message
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processMessage(message: any) {
  switch (message.type) {
    case 'update':
      // Debounce updates on webview side as well (belt and suspenders)
      pendingContent = message.content;
      if (updateDebounceTimer) {
        window.clearTimeout(updateDebounceTimer);
      }
      updateDebounceTimer = window.setTimeout(() => {
        if (pendingContent !== null) {
          updateContent(pendingContent);
          pendingContent = null;
        }
      }, 50); // 50ms debounce on webview side
      break;
  }
}

// Process any queued messages
function processQueuedMessages() {
  if (pendingMessages.length > 0) {
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      processMessage(msg);
    }
  }
}

// Custom HorizontalRuleNode without React dependency
type SerializedHorizontalRuleNode = Spread<{}, SerializedLexicalNode>;

class HorizontalRuleNode extends DecoratorNode<null> {
  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  static importJSON(_serializedNode: SerializedHorizontalRuleNode): HorizontalRuleNode {
    return $createHorizontalRuleNode();
  }

  exportJSON(): SerializedHorizontalRuleNode {
    return {
      type: 'horizontalrule',
      version: 1
    };
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    return document.createElement('hr');
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }
}

function $createHorizontalRuleNode(): HorizontalRuleNode {
  return new HorizontalRuleNode();
}

// Lexical theme with VSCode CSS variable mapping
const theme = {
  code: 'editor-code-block',
  codeHighlight: {
    atrule: 'code-highlight-atrule',
    attr: 'code-highlight-attr',
    boolean: 'code-highlight-boolean',
    builtin: 'code-highlight-builtin',
    cdata: 'code-highlight-cdata',
    char: 'code-highlight-char',
    class: 'code-highlight-class',
    'class-name': 'code-highlight-class-name',
    comment: 'code-highlight-comment',
    constant: 'code-highlight-constant',
    deleted: 'code-highlight-deleted',
    doctype: 'code-highlight-doctype',
    entity: 'code-highlight-entity',
    function: 'code-highlight-function',
    important: 'code-highlight-important',
    inserted: 'code-highlight-inserted',
    keyword: 'code-highlight-keyword',
    namespace: 'code-highlight-namespace',
    number: 'code-highlight-number',
    operator: 'code-highlight-operator',
    prolog: 'code-highlight-prolog',
    property: 'code-highlight-property',
    punctuation: 'code-highlight-punctuation',
    regex: 'code-highlight-regex',
    selector: 'code-highlight-selector',
    string: 'code-highlight-string',
    symbol: 'code-highlight-symbol',
    tag: 'code-highlight-tag',
    url: 'code-highlight-url',
    variable: 'code-highlight-variable',
  },
  table: 'md-table',
  tableCell: 'md-table-cell',
  tableCellHeader: 'md-table-cell-header',
  tableRow: 'md-table-row'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editorConfig: any = {
  namespace: 'MarkdownPreview',
  theme,
  editable: false,
  onError: (error: Error) => {
    console.error('Lexical error:', error);
  },
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    LinkNode,
    AutoLinkNode,
    HorizontalRuleNode,
    TableNode,
    TableRowNode,
    TableCellNode
  ]
};

let editor: ReturnType<typeof createEditor> | null = null;

// Parse filepath link to extract path and line numbers
// Supports: path.ts, path.ts#L42, path.ts#L42-L51
function parseFileLink(href: string): { filePath: string; startLine?: number; endLine?: number } | null {
  // Skip external URLs
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
    return null;
  }

  // Parse line numbers from hash: #L42 or #L42-L51
  const hashIndex = href.indexOf('#');
  let filePath = href;
  let startLine: number | undefined;
  let endLine: number | undefined;

  if (hashIndex !== -1) {
    filePath = href.substring(0, hashIndex);
    const hash = href.substring(hashIndex + 1);

    // Match #L42 or #L42-L51
    const lineMatch = hash.match(/^L(\d+)(?:-L?(\d+))?$/);
    if (lineMatch) {
      startLine = parseInt(lineMatch[1], 10);
      if (lineMatch[2]) {
        endLine = parseInt(lineMatch[2], 10);
      }
    }
  }

  // Validate file path (should look like a relative or file path)
  if (!filePath || filePath.startsWith('#')) {
    return null;
  }

  return { filePath, startLine, endLine };
}

function setupLinkClickHandler(rootElement: HTMLElement) {
  rootElement.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Find closest anchor element
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    const parsed = parseFileLink(href);
    if (parsed) {
      event.preventDefault();
      event.stopPropagation();

      vscode.postMessage({
        type: 'openFile',
        filePath: parsed.filePath,
        startLine: parsed.startLine,
        endLine: parsed.endLine
      });
    }
  });
}

function initEditor() {
  const rootElement = document.getElementById('editor-root');
  if (!rootElement) {
    console.error('[Webview] Root element not found');
    return;
  }

  // Check if editor already exists and is connected to this root
  if (editor) {
    const currentRoot = editor.getRootElement();
    if (currentRoot === rootElement) {
      return;
    }
  }

  editor = createEditor(editorConfig);
  editor.setRootElement(rootElement);
  registerRichText(editor);
  // Register Prism-based code highlighting (uses theme classes)
  registerCodeHighlighting(editor);

  // Setup click handler for file links
  setupLinkClickHandler(rootElement);
}

// Preprocess markdown: remove horizontal rules and convert checkboxes to Unicode
function preprocessMarkdown(markdown: string): string {
  return markdown
    .split('\n')
    .filter(line => !/^-{3,}$/.test(line.trim()))
    .map(line => {
      // Convert task list checkboxes to Unicode symbols
      return line
        .replace(/^(\s*)-\s*\[\s*\]\s+/, '$1- ☐ ')
        .replace(/^(\s*)-\s*\[[xX]\]\s+/, '$1- ✓ ');
    })
    .join('\n');
}

// Parse markdown table row
function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // Remove empty first/last from |col|col|
    .map(cell => cell.trim());
}

// Check if line is a table separator
function isTableSeparator(line: string): boolean {
  return /^\|[-:\s|]+\|$/.test(line.trim());
}

// Check if text looks like a file path
function isFilePath(text: string): boolean {
  const trimmed = text.trim();
  // Check for path-like patterns: contains / or \ and has file extension
  const hasPathSeparator = trimmed.includes('/') || trimmed.includes('\\');
  const hasExtension = /\.\w{1,10}$/.test(trimmed);
  // Also match paths starting with ./ or ../
  const isRelativePath = /^\.\.?\//.test(trimmed);

  return (hasPathSeparator && hasExtension) || isRelativePath;
}

// Parse cell text and create nodes with links
// Supports: markdown link format [text](url) AND plain file paths
function appendCellContent(paragraph: ReturnType<typeof $createParagraphNode>, cellText: string): void {
  // First try markdown link format
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  let hasMarkdownLinks = false;

  while ((match = linkRegex.exec(cellText)) !== null) {
    hasMarkdownLinks = true;
    // Add text before the link
    if (match.index > lastIndex) {
      paragraph.append($createTextNode(cellText.slice(lastIndex, match.index)));
    }

    // Create link node
    const linkText = match[1];
    const linkUrl = match[2];
    const linkNode = $createLinkNode(linkUrl);
    linkNode.append($createTextNode(linkText));
    paragraph.append(linkNode);

    lastIndex = match.index + match[0].length;
  }

  if (hasMarkdownLinks) {
    // Add remaining text after last link
    if (lastIndex < cellText.length) {
      paragraph.append($createTextNode(cellText.slice(lastIndex)));
    }
    return;
  }

  // No markdown links found - check if entire cell is a file path
  const trimmedText = cellText.trim();
  if (isFilePath(trimmedText)) {
    const linkNode = $createLinkNode(trimmedText);
    linkNode.append($createTextNode(trimmedText));
    paragraph.append(linkNode);
    return;
  }

  // Just plain text
  if (cellText.length > 0) {
    paragraph.append($createTextNode(cellText));
  } else {
    paragraph.append($createTextNode(''));
  }
}

// Create Lexical table from markdown table text
function createLexicalTable(tableLines: string[]): TableNode | null {
  if (tableLines.length < 2) return null;

  const headerLine = tableLines[0];
  const separatorLine = tableLines[1];
  const dataLines = tableLines.slice(2);

  if (!isTableSeparator(separatorLine)) return null;

  const headerCells = parseTableRow(headerLine);
  if (headerCells.length === 0) return null;

  const tableNode = $createTableNode();

  // Create header row
  const headerRowNode = $createTableRowNode();
  headerCells.forEach(cellText => {
    const cellNode = $createTableCellNode(TableCellHeaderStates.ROW);
    const paragraph = $createParagraphNode();
    appendCellContent(paragraph, cellText);
    cellNode.append(paragraph);
    headerRowNode.append(cellNode);
  });
  tableNode.append(headerRowNode);

  // Create data rows
  dataLines.forEach(line => {
    if (line.trim() && line.includes('|')) {
      const cells = parseTableRow(line);
      const rowNode = $createTableRowNode();

      // Ensure we have same number of cells as header
      for (let i = 0; i < headerCells.length; i++) {
        const cellText = cells[i] || '';
        const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
        const paragraph = $createParagraphNode();
        appendCellContent(paragraph, cellText);
        cellNode.append(paragraph);
        rowNode.append(cellNode);
      }
      tableNode.append(rowNode);
    }
  });

  return tableNode;
}

// Check if text looks like a table row
function isTableRowContent(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

// Extract table from text content that may contain multiple lines
function extractTableFromContent(content: string): { tableLines: string[]; beforeText: string; afterText: string } | null {
  const lines = content.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  // Find table start and end
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableRowContent(line)) {
      if (tableStart === -1) {
        tableStart = i;
      }
      // Check if next line is separator (for valid table)
      if (tableStart === i && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        // Found valid table header + separator
        tableEnd = i + 1;
        // Continue to find all data rows
        for (let j = i + 2; j < lines.length; j++) {
          if (isTableRowContent(lines[j])) {
            tableEnd = j;
          } else {
            break;
          }
        }
        break;
      } else if (tableStart !== i) {
        // Not a valid table start, reset
        tableStart = -1;
      }
    }
  }

  if (tableStart === -1 || tableEnd === -1) {
    return null;
  }

  const tableLines = lines.slice(tableStart, tableEnd + 1);
  const beforeText = lines.slice(0, tableStart).join('\n').trim();
  const afterText = lines.slice(tableEnd + 1).join('\n').trim();

  // Validate table
  if (tableLines.length >= 2 && isTableSeparator(tableLines[1])) {
    return { tableLines, beforeText, afterText };
  }

  return null;
}

// Find and replace table-like paragraphs in the tree
function findAndReplaceTableParagraphs(): void {
  const MAX_ITERATIONS = 100; // Prevent infinite loops
  let iterations = 0;
  let foundTable = true;

  while (foundTable && iterations < MAX_ITERATIONS) {
    foundTable = false;
    iterations++;

    const root = $getRoot();
    const children = root.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const content = child.getTextContent();

      // Case 1: Single paragraph contains entire table (merged lines)
      if (child.getType() === 'paragraph') {
        const extracted = extractTableFromContent(content);
        if (extracted) {
          const tableNode = createLexicalTable(extracted.tableLines);
          if (tableNode) {
            // If there's text before table, create paragraph for it
            if (extracted.beforeText) {
              const beforePara = $createParagraphNode();
              beforePara.append($createTextNode(extracted.beforeText));
              child.insertBefore(beforePara);
            }

            // Replace with table
            child.replace(tableNode);

            // If there's text after table, create paragraph for it
            if (extracted.afterText) {
              const afterPara = $createParagraphNode();
              afterPara.append($createTextNode(extracted.afterText));
              tableNode.insertAfter(afterPara);
            }

            foundTable = true;
            break; // Restart from beginning
          }
        }

        // Case 2: Table spans multiple consecutive paragraphs
        if (isTableRowContent(content)) {
          const tableRows: string[] = [content];
          let j = i + 1;

          while (j < children.length) {
            const nextChild = children[j];
            const nextContent = nextChild.getTextContent();

            if (nextChild.getType() === 'paragraph' && isTableRowContent(nextContent)) {
              tableRows.push(nextContent);
              j++;
            } else {
              break;
            }
          }

          if (tableRows.length >= 2 && isTableSeparator(tableRows[1])) {
            const tableNode = createLexicalTable(tableRows);
            if (tableNode) {
              child.replace(tableNode);

              // Remove remaining table paragraphs
              for (let k = i + 1; k < j; k++) {
                if (children[k] && children[k].isAttached()) {
                  children[k].remove();
                }
              }

              foundTable = true;
              break; // Restart from beginning
            }
          }
        }
      }
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn('[Webview] Table processing hit max iterations, some tables may not be rendered');
  }
}

// Process markdown with table support
function processMarkdownWithTables(markdown: string): void {
  const root = $getRoot();
  root.clear();

  // Remove horizontal rules
  const cleanedMarkdown = preprocessMarkdown(markdown);

  if (cleanedMarkdown.trim()) {
    try {
      // Convert markdown - tables will become paragraphs with pipe characters
      $convertFromMarkdownString(cleanedMarkdown, TRANSFORMERS);

      // Find and replace table paragraphs
      findAndReplaceTableParagraphs();

    } catch {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(cleanedMarkdown));
      root.append(paragraph);
    }
  }

  // If nothing was added, show placeholder
  if (root.getChildrenSize() === 0) {
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode('No content'));
    root.append(paragraph);
  }
}

// Content hash tracking to prevent redundant updates
let lastContentHash = '';

// Performance threshold for very large files
const VERY_LARGE_FILE_THRESHOLD = 100000; // chars

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function updateContent(markdown: string) {
  // Check if content has actually changed
  const contentHash = simpleHash(markdown);
  if (contentHash === lastContentHash) {
    return;
  }
  lastContentHash = contentHash;

  if (!editor) {
    initEditor();
  }

  if (editor) {
    const contentLength = markdown.length;

    // Warn for very large files
    if (contentLength > VERY_LARGE_FILE_THRESHOLD) {
      console.warn(`[Webview] Very large file (${contentLength} chars), rendering may fail`);
    }

    try {
      const startTime = performance.now();

      editor.update(() => {
        try {
          processMarkdownWithTables(markdown);

          // Warn if rendering took too long
          const endTime = performance.now();
          const duration = endTime - startTime;
          if (duration > 1000) {
            console.warn(`[Webview] Slow render: ${duration.toFixed(2)}ms for ${contentLength} chars`);
          }
        } catch (innerError) {
          console.error('[Webview] Error in processMarkdownWithTables:', innerError);

          // Fallback: show error message
          const root = $getRoot();
          root.clear();
          const errorPara = $createParagraphNode();
          errorPara.append($createTextNode(
            `⚠️ Error rendering markdown (${contentLength} chars). File may be too large or contain unsupported syntax.\n\nError: ${innerError}`
          ));
          root.append(errorPara);
        }
      }, {
        discrete: true
      });
    } catch (error) {
      console.error('[Webview] Fatal error in updateContent:', error);

      // Show error in UI
      const rootElement = document.getElementById('editor-root');
      if (rootElement) {
        rootElement.innerHTML = `<p style="color: red; padding: 20px;">
          ⚠️ Failed to render markdown (${contentLength} chars)<br><br>
          Error: ${error}<br><br>
          Try splitting the file into smaller documents.
        </p>`;
      }
    }
  }
}

// Setup toolbar button click handlers
function setupToolbarButtons() {
  // Execute button
  const executeBtn = document.getElementById('execute-btn');
  if (executeBtn) {
    executeBtn.addEventListener('click', () => {
      const filePath = executeBtn.getAttribute('data-filepath');
      if (filePath) {
        vscode.postMessage({
          type: 'executeInTerminal',
          filePath: filePath
        });
      }
    });
  }

  // Copy Prompt button
  const copyPromptBtn = document.getElementById('copy-prompt-btn');
  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', () => {
      const filePath = copyPromptBtn.getAttribute('data-filepath');
      if (filePath) {
        vscode.postMessage({
          type: 'copyPrompt',
          filePath: filePath
        });
      }
    });
  }

  // Review select dropdown
  const reviewSelect = document.getElementById('review-select') as HTMLSelectElement;
  if (reviewSelect) {
    reviewSelect.addEventListener('change', () => {
      const wrapper = reviewSelect.closest('.toolbar-select-wrapper');
      const filePath = wrapper?.getAttribute('data-filepath');
      const action = reviewSelect.value;

      if (filePath && action) {
        if (action === 'copy') {
          vscode.postMessage({
            type: 'copyReviewPrompt',
            filePath: filePath
          });
        } else if (action === 'run') {
          vscode.postMessage({
            type: 'executeReview',
            filePath: filePath
          });
        }
        // Reset select to default
        reviewSelect.selectedIndex = 0;
      }
    });
  }
}

// Initialize when DOM is ready
function initialize() {
  if (isInitialized) {
    return;
  }

  initEditor();
  setupToolbarButtons();

  // Mark as initialized BEFORE processing queued messages
  isInitialized = true;

  // Process any messages that arrived before initialization
  processQueuedMessages();

  // Send ready message to extension
  vscode.postMessage({ type: 'ready' });
}

document.addEventListener('DOMContentLoaded', () => {
  initialize();
});

// Also try to init immediately in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initialize();
}
