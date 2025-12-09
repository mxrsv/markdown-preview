# Custom Prompts Settings Implementation

### Objective

Cho phep user tu dinh nghia prompts cho cac button trong toolbar (Execute Plan, Copy Prompt, Review) thong qua VSCode settings thay vi hardcoded trong code.

---

### Approach

Su dung `vscode.workspace.getConfiguration()` API de doc settings tu `settings.json`. User co the config o:
- **User Settings** (global)
- **Workspace Settings** (per project)

**Design principle:**
- `@${filePath}` **luôn được tự động thêm** vào đầu prompt (không cho user thay đổi)
- User chỉ config phần **instructions** (text đằng sau file reference)
- Format cuối cùng: `@<resolved_path> <user_instructions>`

---

### Steps

### Step 1: Add Configuration Schema to package.json

Them cac settings vao `contributes.configuration.properties`:

```json
"markdownLexicalPreview.prompts.executeInstructions": {
  "type": "string",
  "default": "Implement the plan as specified...",
  "description": "Instructions for Execute Plan button. File reference (@filepath) is automatically added.",
  "editPresentation": "multilineText"
},
"markdownLexicalPreview.prompts.reviewInstructions": {
  "type": "string",
  "default": "Review this document thoroughly...",
  "description": "Instructions for Review action. File reference (@filepath) is automatically added.",
  "editPresentation": "multilineText"
}
```

**Note:** Setting name đổi thành `*Instructions` để rõ ràng user chỉ config phần instructions.

### Step 2: Create PromptService Helper

Tao file moi `src/services/PromptService.ts`:

```typescript
import * as vscode from 'vscode';
import { DEFAULT_EXECUTE_INSTRUCTIONS, DEFAULT_REVIEW_INSTRUCTIONS } from '../constants/defaultPrompts';

export class PromptService {
  private static getConfig() {
    return vscode.workspace.getConfiguration('markdownLexicalPreview');
  }

  /**
   * Build final prompt: @{filePath} + user instructions
   * filePath is ALWAYS prepended automatically
   */
  static buildPrompt(filePath: string, instructions: string): string {
    return `@${filePath} ${instructions}`;
  }

  static getExecutePrompt(filePath: string): string {
    const config = this.getConfig();
    const instructions = config.get<string>('prompts.executeInstructions', DEFAULT_EXECUTE_INSTRUCTIONS);
    return this.buildPrompt(filePath, instructions);
  }

  static getReviewPrompt(filePath: string): string {
    const config = this.getConfig();
    const instructions = config.get<string>('prompts.reviewInstructions', DEFAULT_REVIEW_INSTRUCTIONS);
    return this.buildPrompt(filePath, instructions);
  }
}
```

### Step 3: Update MarkdownEditorProvider

Thay the hardcoded prompts bang PromptService:

```typescript
// Before
private executeInTerminal(filePath: string): void {
  const command = `claude "@${filePath} Implement the plan..."`;
  // ...
}

// After
private executeInTerminal(filePath: string): void {
  const prompt = PromptService.getExecutePrompt(filePath);
  const command = `claude "${prompt}"`;
  // ...
}
```

### Step 4: Add Default Instruction Constants

Tao file `src/constants/defaultPrompts.ts`:

```typescript
// Only the instructions part - @${filePath} is auto-prepended by PromptService

export const DEFAULT_EXECUTE_INSTRUCTIONS = `Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.`;

export const DEFAULT_REVIEW_INSTRUCTIONS = `Review this document thoroughly.

Do NOT edit the file.
Do NOT rewrite the entire content.

Your tasks:
- Assess structure, clarity, and correctness
- Identify unclear, incorrect, or redundant parts
- Suggest concrete improvements
- Point out formatting or structural issues where relevant

Provide feedback and suggestions only.
Return the result in a clear, structured format.`;
```

---

### Files to Modify

- [package.json](package.json) - Add configuration schema
- [src/providers/MarkdownEditorProvider.ts](src/providers/MarkdownEditorProvider.ts) - Use PromptService instead of hardcoded prompts

### Files to Create

- [src/services/PromptService.ts](src/services/PromptService.ts) - New service for prompt management
- [src/constants/defaultPrompts.ts](src/constants/defaultPrompts.ts) - Default prompt templates

---

### User Experience

User co the custom instructions trong `settings.json`:

```json
{
  "markdownLexicalPreview.prompts.executeInstructions": "My custom execute instructions here...",
  "markdownLexicalPreview.prompts.reviewInstructions": "My custom review instructions here..."
}
```

**Final prompt được build tự động:**
```
@path/to/file.md My custom execute instructions here...
```

Hoac thong qua Settings UI:
1. Open Settings (Cmd+,)
2. Search "Markdown Lexical Preview"
3. Edit instructions in multiline text fields

**Lợi ích của thiết kế này:**
- User không cần nhớ syntax `@${filePath}`
- Không thể vô tình xóa file reference
- Config đơn giản hơn, chỉ focus vào nội dung instructions

---

### To-dos

- [ ] Add prompt configuration schema to package.json
- [ ] Create PromptService.ts with variable resolution
- [ ] Create defaultPrompts.ts constants file
- [ ] Update MarkdownEditorProvider to use PromptService
- [ ] Test with custom prompts in user settings
- [ ] Test with workspace-level settings override

---

### Notes

- `editPresentation: "multilineText"` cho phep edit instructions trong textarea thay vi single line
- Settings co the override theo hierarchy: Default < User < Workspace
- Neu user xoa instructions thi fall back ve default
- `@${filePath}` luôn được auto-prepend, user không cần care về file reference
