## Deep Review: Lexical Packages Enhancement Analysis

### Review Summary

**Project**: Markdown Preview Lexical (VSCode Extension)
**Purpose**: Preview Markdown files using Lexical editor in readonly mode
**Review Focus**: Analyze unused Lexical packages and recommend enhancements

---

### Current Package Usage

**Packages đang sử dụng (10/29)**:
- `lexical` (core) - Engine chính
- `@lexical/code` - Code blocks với Prism highlighting
- `@lexical/headless` - Server-side rendering (listed but unused)
- `@lexical/html` - HTML conversion (listed but unused)
- `@lexical/link` - Link nodes
- `@lexical/list` - List nodes
- `@lexical/markdown` - Markdown transformers
- `@lexical/react` - React integration (listed but unused - vanilla approach)
- `@lexical/rich-text` - Rich text formatting
- `@lexical/table` - Table support (listed but not imported in webview)

---

### Packages Chưa Sử Dụng - Analysis

#### Priority 1: Highly Recommended

**1. @lexical/code-shiki** ⭐⭐⭐⭐⭐
- **What**: Syntax highlighting sử dụng Shiki engine (same as VSCode)
- **Why**:
  - Shiki dùng TextMate grammars giống VSCode
  - Hỗ trợ nhiều ngôn ngữ hơn Prism
  - Colors chính xác theo theme VSCode
- **Implementation effort**: Medium
- **Benefit**: Trải nghiệm code highlighting consistent với editor

**2. @lexical/utils** ⭐⭐⭐⭐⭐
- **What**: Utility functions ($getNearestNodeOfType, mergeRegister, etc.)
- **Why**:
  - `mergeRegister` - clean up multiple listeners
  - `$getNearestNodeOfType` - traverse tree efficiently
  - `$insertNodeToNearestRoot` - safe node insertion
- **Implementation effort**: Low
- **Benefit**: Cleaner code, less bugs

**3. @lexical/selection** ⭐⭐⭐⭐
- **What**: Selection utilities
- **Why**:
  - `$setBlocksType` - transform selected blocks
  - `$selectAll` - select all content
  - `$isAtNodeEnd` - cursor position checks
- **Implementation effort**: Low
- **Benefit**: Better text selection handling

#### Priority 2: Useful Features

**4. @lexical/mark** ⭐⭐⭐⭐
- **What**: Text marking/highlighting nodes
- **Why**:
  - Search & highlight text
  - Annotation/commenting
  - Highlight code references
- **Use case**: Implement "Find in preview" feature
- **Implementation effort**: Medium

**5. @lexical/clipboard** ⭐⭐⭐
- **What**: Copy/paste handling
- **Why**:
  - Custom copy behavior
  - Copy as rich text or markdown
  - Preserve formatting when copying
- **Use case**: Right-click copy with formatting
- **Implementation effort**: Medium

**6. @lexical/hashtag** ⭐⭐⭐
- **What**: Hashtag node support
- **Why**:
  - Auto-detect #hashtags in markdown
  - Clickable hashtag links
  - Filter by hashtag
- **Use case**: Documentation with tags
- **Implementation effort**: Low

**7. @lexical/text** ⭐⭐⭐
- **What**: Text manipulation utilities
- **Why**:
  - `$isTextNode` - type checking
  - `$createTextNode` - factory
  - Text formatting helpers
- **Implementation effort**: Low

**8. @lexical/file** ⭐⭐⭐
- **What**: File import/export utilities
- **Why**:
  - Export preview as HTML
  - Export as PDF (via HTML)
  - Import from other formats
- **Use case**: "Export Preview" command
- **Implementation effort**: Medium

#### Priority 3: Nice to Have

**9. @lexical/devtools-core** ⭐⭐
- **What**: Debug/inspect Lexical state
- **Why**:
  - Debug node tree
  - Inspect editor state
  - Performance profiling
- **Use case**: Development only
- **Implementation effort**: Low

**10. @lexical/offset** ⭐⭐
- **What**: Offset calculation utilities
- **Why**:
  - Map DOM position to Lexical position
  - Scroll-to-position
  - Line number calculation
- **Use case**: Sync preview scroll with editor
- **Implementation effort**: High

**11. @lexical/overflow** ⭐⭐
- **What**: Overflow handling for long content
- **Why**:
  - Virtual scrolling
  - Lazy render large documents
  - Memory optimization
- **Use case**: Large markdown files
- **Implementation effort**: High

**12. @lexical/eslint-plugin** ⭐⭐
- **What**: ESLint rules for Lexical patterns
- **Why**:
  - Catch common mistakes
  - Best practices enforcement
  - Code quality
- **Use case**: Development tooling
- **Implementation effort**: Low

#### Priority 4: Not Needed

**13. @lexical/history** ⭐
- **Skip reason**: Readonly mode - no undo/redo needed

**14. @lexical/dragon** ⭐
- **Skip reason**: Dragon NaturallySpeaking speech recognition - not relevant

**15. @lexical/yjs** ⭐
- **Skip reason**: Collaborative editing - single user preview

**16. @lexical/plain-text** ⭐
- **Skip reason**: Already using rich-text mode

**17. @lexical/tailwind** ⭐
- **Skip reason**: Using custom CSS, not Tailwind

**18. @lexical/extension** ⭐
- **Skip reason**: Advanced extension APIs - not needed for basic preview

---

### Recommended Implementation Plan

#### Phase 1: Quick Wins (Low effort, High value)
1. Add `@lexical/utils` - Better code organization
2. Add `@lexical/selection` - Improved selection handling
3. Add `@lexical/text` - Text utilities
4. Add `@lexical/eslint-plugin` - Dev tooling

#### Phase 2: Enhanced Features
1. Implement `@lexical/code-shiki` - VSCode-consistent highlighting
2. Add `@lexical/mark` - Search & highlight feature
3. Add `@lexical/clipboard` - Copy with formatting

#### Phase 3: Advanced Features
1. Add `@lexical/file` - Export functionality
2. Add `@lexical/hashtag` - Tag support
3. Consider `@lexical/offset` - Scroll sync

---

### Code Examples

#### Example 1: Using @lexical/utils

```typescript
// Before (current code)
const unregister1 = editor.registerUpdateListener(...);
const unregister2 = editor.registerCommand(...);
// Manual cleanup

// After (with @lexical/utils)
import { mergeRegister } from '@lexical/utils';

const unregister = mergeRegister(
  editor.registerUpdateListener(...),
  editor.registerCommand(...)
);
// Single cleanup
```

#### Example 2: Using @lexical/code-shiki

```typescript
import { registerCodeHighlighting } from '@lexical/code';
import { createHighlighter } from 'shiki';

// Current: Prism-based (limited themes)
registerCodeHighlighting(editor);

// Enhanced: Shiki-based (VSCode themes)
const highlighter = await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['typescript', 'javascript', 'python', ...]
});
registerShikiCodeHighlighting(editor, highlighter);
```

#### Example 3: Using @lexical/mark for Search

```typescript
import { $createMarkNode, MarkNode } from '@lexical/mark';

function highlightSearchTerms(searchTerm: string) {
  editor.update(() => {
    const root = $getRoot();
    // Find and wrap matching text with MarkNode
    // This enables search highlighting in preview
  });
}
```

---

### Fixing Current Issues

#### Issue 1: Unused Dependencies

**File**: [package.json](package.json#L83-L93)

```json
// These are listed but not actually used in code:
"@lexical/headless": "^0.17.0",  // Not imported
"@lexical/html": "^0.17.0",      // Not imported
"@lexical/react": "^0.17.0",     // Not imported (vanilla approach)
"@lexical/table": "^0.38.2",     // Not imported in webview
```

**Recommendation**:
- Remove `@lexical/headless` - not needed for client-side preview
- Remove `@lexical/react` - using vanilla Lexical approach
- Import `@lexical/table` or remove if tables handled via custom HTML

#### Issue 2: Table Support

**File**: [src/webview/index.ts:207-277](src/webview/index.ts#L207-L277)

Current implementation manually parses markdown tables to HTML. Consider using `@lexical/table` properly:

```typescript
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';

const editorConfig = {
  nodes: [
    // ... existing nodes
    TableNode,
    TableCellNode,
    TableRowNode
  ]
};
```

---

### Summary Table

| Package | Priority | Effort | Value | Recommendation |
|---------|----------|--------|-------|----------------|
| @lexical/code-shiki | 1 | Medium | High | Add for better code highlighting |
| @lexical/utils | 1 | Low | High | Add immediately |
| @lexical/selection | 1 | Low | High | Add immediately |
| @lexical/mark | 2 | Medium | High | Add for search feature |
| @lexical/clipboard | 2 | Medium | Medium | Add for copy support |
| @lexical/hashtag | 2 | Low | Medium | Nice to have |
| @lexical/text | 2 | Low | Medium | Add for utilities |
| @lexical/file | 2 | Medium | Medium | Add for export |
| @lexical/devtools-core | 3 | Low | Low | Dev only |
| @lexical/offset | 3 | High | Medium | Future consideration |
| @lexical/overflow | 3 | High | Low | Future consideration |
| @lexical/history | 4 | - | - | Skip (readonly) |
| @lexical/dragon | 4 | - | - | Skip (not relevant) |
| @lexical/yjs | 4 | - | - | Skip (single user) |
