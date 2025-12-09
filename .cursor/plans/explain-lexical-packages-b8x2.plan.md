# Explanation: Lexical Packages - Purpose and Capabilities

### Overview

Lexical là một text editor framework của Meta (Facebook), được thiết kế để xây dựng rich text editors. Nó chia thành nhiều packages nhỏ để developers chỉ cần import những gì cần thiết.

Document này giải thích mục đích và khả năng của từng package trong ecosystem Lexical.

---

### Core Package

#### lexical (core)

**Mục đích**: Engine chính của Lexical editor.

**Khả năng**:
- Tạo và quản lý editor state
- Xây dựng DOM tree từ nodes
- Event handling (keyboard, mouse, selection)
- Command system
- Plugin architecture

**Demo code**:
```typescript
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

// Tạo editor instance
const editor = createEditor({
  namespace: 'MyEditor',
  nodes: [], // Registered nodes
  onError: (error) => console.error(error)
});

// Mount vào DOM
editor.setRootElement(document.getElementById('editor'));

// Update content
editor.update(() => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode('Hello World'));
  root.append(paragraph);
});

// Listen to changes
editor.registerUpdateListener(({ editorState }) => {
  console.log('Editor changed:', editorState.toJSON());
});
```

---

### Text Formatting Packages

#### @lexical/rich-text

**Mục đích**: Hỗ trợ rich text formatting (headings, quotes, paragraphs).

**Khả năng**:
- HeadingNode (h1-h6)
- QuoteNode (blockquotes)
- Keyboard shortcuts (Ctrl+B, Ctrl+I)
- Text alignment

**Demo code**:
```typescript
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';

const config = {
  nodes: [HeadingNode, QuoteNode]
};

const editor = createEditor(config);
registerRichText(editor); // Enable rich text behaviors

// Tạo heading
editor.update(() => {
  const heading = $createHeadingNode('h1');
  heading.append($createTextNode('My Title'));
  $getRoot().append(heading);
});
```

#### @lexical/plain-text

**Mục đích**: Plain text mode (không có formatting).

**Khả năng**:
- Simple text input
- No formatting shortcuts
- Lightweight alternative to rich-text

**Demo code**:
```typescript
import { registerPlainText } from '@lexical/plain-text';

const editor = createEditor(config);
registerPlainText(editor); // Only plain text allowed
```

#### @lexical/text

**Mục đích**: Text manipulation utilities.

**Khả năng**:
- `$isTextNode()` - Type checking
- `$createTextNode()` - Factory function
- Text format helpers
- Unicode handling

**Demo code**:
```typescript
import { $isTextNode, $createTextNode } from '@lexical/text';

editor.update(() => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const nodes = selection.getNodes();
    nodes.forEach(node => {
      if ($isTextNode(node)) {
        console.log('Text content:', node.getTextContent());
      }
    });
  }
});
```

---

### Content Type Packages

#### @lexical/list

**Mục đích**: Ordered và unordered lists.

**Khả năng**:
- Bulleted lists (ul)
- Numbered lists (ol)
- Nested lists
- Tab/Shift+Tab indent

**Demo code**:
```typescript
import { ListNode, ListItemNode, $createListNode, $createListItemNode } from '@lexical/list';

const config = {
  nodes: [ListNode, ListItemNode]
};

editor.update(() => {
  const list = $createListNode('bullet'); // or 'number'

  const item1 = $createListItemNode();
  item1.append($createTextNode('First item'));

  const item2 = $createListItemNode();
  item2.append($createTextNode('Second item'));

  list.append(item1, item2);
  $getRoot().append(list);
});
```

#### @lexical/link

**Mục đích**: Hyperlink support.

**Khả năng**:
- LinkNode - manual links
- AutoLinkNode - auto-detect URLs
- Link editing UI
- Open link handling

**Demo code**:
```typescript
import { LinkNode, AutoLinkNode, $createLinkNode, toggleLink } from '@lexical/link';

const config = {
  nodes: [LinkNode, AutoLinkNode]
};

editor.update(() => {
  const link = $createLinkNode('https://example.com');
  link.append($createTextNode('Click here'));
  $getRoot().getFirstChild().append(link);
});

// Toggle link on selection
editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://example.com');
```

#### @lexical/table

**Mục đích**: Table support.

**Khả năng**:
- Tạo tables
- Add/remove rows/columns
- Cell selection
- Header cells
- Merge cells (advanced)

**Demo code**:
```typescript
import {
  TableNode,
  TableRowNode,
  TableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates
} from '@lexical/table';

editor.update(() => {
  const table = $createTableNode();

  // Header row
  const headerRow = $createTableRowNode();
  ['Name', 'Age', 'City'].forEach(text => {
    const cell = $createTableCellNode(TableCellHeaderStates.ROW);
    const p = $createParagraphNode();
    p.append($createTextNode(text));
    cell.append(p);
    headerRow.append(cell);
  });
  table.append(headerRow);

  // Data row
  const dataRow = $createTableRowNode();
  ['John', '30', 'NYC'].forEach(text => {
    const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
    const p = $createParagraphNode();
    p.append($createTextNode(text));
    cell.append(p);
    dataRow.append(cell);
  });
  table.append(dataRow);

  $getRoot().append(table);
});
```

#### @lexical/code

**Mục đích**: Code blocks với syntax highlighting.

**Khả năng**:
- CodeNode - code blocks
- CodeHighlightNode - syntax tokens
- Language detection
- Prism-based highlighting
- Line numbers

**Demo code**:
```typescript
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code';

const config = {
  nodes: [CodeNode, CodeHighlightNode],
  theme: {
    code: 'editor-code',
    codeHighlight: {
      keyword: 'code-keyword',
      string: 'code-string',
      comment: 'code-comment'
    }
  }
};

const editor = createEditor(config);
registerCodeHighlighting(editor); // Enable Prism highlighting

editor.update(() => {
  const codeBlock = $createCodeNode('javascript');
  codeBlock.append($createTextNode('const x = 42;'));
  $getRoot().append(codeBlock);
});
```

#### @lexical/code-shiki

**Mục đích**: Syntax highlighting sử dụng Shiki (same engine as VSCode).

**Khả năng**:
- TextMate grammars (giống VSCode)
- 100+ languages
- VSCode themes support
- Better accuracy than Prism

**Demo code**:
```typescript
import { registerShikiCodeHighlighting } from '@lexical/code-shiki';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['typescript', 'javascript', 'python', 'rust']
});

registerShikiCodeHighlighting(editor, highlighter);
```

#### @lexical/hashtag

**Mục đích**: Hashtag detection và highlighting.

**Khả năng**:
- Auto-detect #hashtags
- HashtagNode
- Custom styling
- Click handlers

**Demo code**:
```typescript
import { HashtagNode, $createHashtagNode } from '@lexical/hashtag';

const config = {
  nodes: [HashtagNode],
  theme: {
    hashtag: 'editor-hashtag' // CSS class
  }
};

// Auto-detect hashtags khi typing
// Text "#react" sẽ tự động trở thành HashtagNode
```

---

### Markdown Packages

#### @lexical/markdown

**Mục đích**: Markdown import/export.

**Khả năng**:
- Convert markdown string to Lexical nodes
- Export Lexical to markdown
- Built-in transformers
- Custom transformers

**Demo code**:
```typescript
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from '@lexical/markdown';

// Import markdown
editor.update(() => {
  const markdown = '# Hello\n\nThis is **bold** text.';
  $convertFromMarkdownString(markdown, TRANSFORMERS);
});

// Export to markdown
editor.getEditorState().read(() => {
  const markdown = $convertToMarkdownString(TRANSFORMERS);
  console.log(markdown);
});
```

#### @lexical/html

**Mục đích**: HTML import/export.

**Khả năng**:
- Parse HTML to Lexical nodes
- Export Lexical to HTML
- Preserve formatting

**Demo code**:
```typescript
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// Export to HTML
editor.update(() => {
  const htmlString = $generateHtmlFromNodes(editor);
  console.log(htmlString);
});

// Import from HTML
const parser = new DOMParser();
const dom = parser.parseFromString('<p>Hello</p>', 'text/html');
editor.update(() => {
  const nodes = $generateNodesFromDOM(editor, dom);
  $getRoot().append(...nodes);
});
```

---

### Selection and Clipboard

#### @lexical/selection

**Mục đích**: Selection manipulation utilities.

**Khả năng**:
- `$selectAll()` - Select all content
- `$setBlocksType()` - Transform selected blocks
- `$isAtNodeEnd()` - Cursor position
- `$wrapNodes()` - Wrap selection

**Demo code**:
```typescript
import {
  $selectAll,
  $setBlocksType,
  $isAtNodeEnd,
  $wrapNodes
} from '@lexical/selection';

editor.update(() => {
  // Select all
  $selectAll();

  // Convert selection to heading
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    $setBlocksType(selection, () => $createHeadingNode('h2'));
  }
});
```

#### @lexical/clipboard

**Mục đích**: Copy/paste handling.

**Khả năng**:
- Custom copy behavior
- Paste processing
- Copy as HTML/plain text
- Inter-editor copy

**Demo code**:
```typescript
import {
  $getHtmlContent,
  $getLexicalContent,
  $insertDataTransferForRichText
} from '@lexical/clipboard';

// Custom copy handler
editor.registerCommand(COPY_COMMAND, () => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const htmlContent = $getHtmlContent(editor);
    // Custom clipboard logic
  }
  return true;
});
```

#### @lexical/mark

**Mục đích**: Text marking/highlighting.

**Khả năng**:
- MarkNode - highlight text
- Search highlighting
- Comments/annotations
- Multiple mark types

**Demo code**:
```typescript
import { MarkNode, $createMarkNode, $wrapSelectionInMarkNode } from '@lexical/mark';

const config = {
  nodes: [MarkNode],
  theme: {
    mark: 'editor-mark',
    markOverlap: 'editor-mark-overlap'
  }
};

// Highlight search results
editor.update(() => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    $wrapSelectionInMarkNode(selection, false, 'search-highlight');
  }
});
```

---

### History and State

#### @lexical/history

**Mục đích**: Undo/redo functionality.

**Khả năng**:
- Undo stack
- Redo stack
- History merging
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Demo code**:
```typescript
import { createEmptyHistoryState, registerHistory } from '@lexical/history';

const historyState = createEmptyHistoryState();
registerHistory(editor, historyState, 1000); // 1s delay for merging

// Undo/redo commands
editor.dispatchCommand(UNDO_COMMAND, undefined);
editor.dispatchCommand(REDO_COMMAND, undefined);
```

#### @lexical/yjs

**Mục đích**: Real-time collaboration via Yjs.

**Khả năng**:
- Multi-user editing
- Conflict resolution
- Cursor awareness
- WebSocket/WebRTC sync

**Demo code**:
```typescript
import { CollaborationPlugin } from '@lexical/yjs';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();
const provider = new WebsocketProvider('wss://server.com', 'room-id', doc);

// In React
<CollaborationPlugin
  id="main"
  providerFactory={(id, yjsDocMap) => provider}
  shouldBootstrap={true}
/>
```

---

### Utilities

#### @lexical/utils

**Mục đích**: General utility functions.

**Khả năng**:
- `mergeRegister()` - Cleanup multiple listeners
- `$getNearestNodeOfType()` - Tree traversal
- `$insertNodeToNearestRoot()` - Safe insertion
- `addClassNamesToElement()` - DOM helpers

**Demo code**:
```typescript
import {
  mergeRegister,
  $getNearestNodeOfType,
  $insertNodeToNearestRoot
} from '@lexical/utils';

// Clean up multiple registrations
const cleanup = mergeRegister(
  editor.registerUpdateListener(() => {}),
  editor.registerCommand(KEY_ENTER_COMMAND, () => false),
  editor.registerNodeTransform(TextNode, () => {})
);

// Later: cleanup all at once
cleanup();

// Find nearest parent of type
editor.update(() => {
  const selection = $getSelection();
  const node = selection.anchor.getNode();
  const listNode = $getNearestNodeOfType(node, ListNode);
});
```

#### @lexical/offset

**Mục đích**: Offset mapping giữa DOM và Lexical.

**Khả năng**:
- DOM position to Lexical offset
- Scroll-to-position
- Character counting
- Range mapping

**Demo code**:
```typescript
import { $getOffset, createOffsetView } from '@lexical/offset';

const offsetView = createOffsetView(editor);

// Get offset at selection
editor.update(() => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const offset = $getOffset(selection.anchor);
    console.log('Cursor at character:', offset);
  }
});
```

#### @lexical/overflow

**Mục đích**: Content overflow handling.

**Khả năng**:
- OverflowNode - limit visible content
- Character limits
- "Read more" functionality

**Demo code**:
```typescript
import { OverflowNode, $createOverflowNode } from '@lexical/overflow';

// Limit content display
editor.update(() => {
  const overflow = $createOverflowNode();
  // Content beyond limit will be hidden
});
```

---

### File Handling

#### @lexical/file

**Mục đích**: File import/export.

**Khả năng**:
- Export editor state to file
- Import from file
- JSON serialization

**Demo code**:
```typescript
import { exportFile, importFile } from '@lexical/file';

// Export editor state as JSON file
exportFile(editor, {
  fileName: 'document.lexical',
  source: 'MyApp'
});

// Import from file
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  importFile(editor, file);
});
```

---

### Development Tools

#### @lexical/devtools-core

**Mục đích**: Debug và inspect Lexical state.

**Khả năng**:
- View node tree
- Inspect editor state
- Performance profiling
- Command logging

**Usage**: Install Lexical DevTools browser extension.

#### @lexical/eslint-plugin

**Mục đích**: ESLint rules cho Lexical patterns.

**Khả năng**:
- Detect unsafe node access
- Enforce $ prefix convention
- Best practices

**Demo code**:
```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@lexical'],
  rules: {
    '@lexical/rules-of-lexical': 'error'
  }
};
```

---

### Specialized Packages

#### @lexical/dragon

**Mục đích**: Dragon NaturallySpeaking support.

**Khả năng**: Voice-to-text integration với Dragon software.

#### @lexical/headless

**Mục đích**: Server-side Lexical (no DOM).

**Khả năng**:
- SSR rendering
- Content validation
- Headless processing

**Demo code**:
```typescript
import { createHeadlessEditor } from '@lexical/headless';

const editor = createHeadlessEditor({
  nodes: [HeadingNode, ListNode],
  onError: console.error
});

// Process content without DOM
editor.update(() => {
  $convertFromMarkdownString('# Hello', TRANSFORMERS);
});

const state = editor.getEditorState();
const json = state.toJSON();
```

#### @lexical/react

**Mục đích**: React integration.

**Khả năng**:
- LexicalComposer - context provider
- Plugins as React components
- Hooks (useLexicalComposerContext)

**Demo code**:
```tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';

function Editor() {
  return (
    <LexicalComposer initialConfig={config}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter text...</div>}
      />
    </LexicalComposer>
  );
}
```

#### @lexical/extension

**Mục đích**: Extension/plugin system.

**Khả năng**: Advanced plugin APIs.

#### @lexical/tailwind

**Mục đích**: Tailwind CSS class integration.

**Khả năng**: Pre-built Tailwind theme cho Lexical.

---

### Package Relationships

```
lexical (core)
    |
    +-- @lexical/rich-text (formatting)
    +-- @lexical/plain-text (no formatting)
    |
    +-- @lexical/list
    +-- @lexical/link
    +-- @lexical/table
    +-- @lexical/code
    |      +-- @lexical/code-shiki (alternative)
    |
    +-- @lexical/markdown (import/export)
    +-- @lexical/html (import/export)
    |
    +-- @lexical/selection
    +-- @lexical/clipboard
    +-- @lexical/mark
    |
    +-- @lexical/history
    +-- @lexical/yjs (collaboration)
    |
    +-- @lexical/utils
    +-- @lexical/offset
    +-- @lexical/overflow
    |
    +-- @lexical/react (framework integration)
    +-- @lexical/headless (server-side)
```

---

### Recommendation for This Project

Dự án **markdown-preview-lexical** là VSCode extension preview markdown ở readonly mode. Dựa trên use case này:

**Nên thêm**:
- `@lexical/utils` - Code cleaner với `mergeRegister`
- `@lexical/selection` - Better selection handling
- `@lexical/code-shiki` - VSCode-consistent syntax highlighting
- `@lexical/mark` - Search highlighting trong preview

**Không cần thiết**:
- `@lexical/history` - Readonly, không cần undo
- `@lexical/yjs` - Single user
- `@lexical/react` - Đang dùng vanilla approach
- `@lexical/dragon` - Voice input không relevant
