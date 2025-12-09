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
