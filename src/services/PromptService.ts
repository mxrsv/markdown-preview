import * as vscode from "vscode";
import {
    DEFAULT_EXECUTE_INSTRUCTIONS,
    DEFAULT_REVIEW_INSTRUCTIONS,
} from "../constants/defaultPrompts";

export class PromptService {
    private static getConfig() {
        return vscode.workspace.getConfiguration("markdownLexicalPreview");
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
        const instructions = config.get<string>(
            "prompts.executeInstructions",
            DEFAULT_EXECUTE_INSTRUCTIONS
        );
        return this.buildPrompt(filePath, instructions);
    }

    static getReviewPrompt(filePath: string): string {
        const config = this.getConfig();
        const instructions = config.get<string>(
            "prompts.reviewInstructions",
            DEFAULT_REVIEW_INSTRUCTIONS
        );
        return this.buildPrompt(filePath, instructions);
    }
}
