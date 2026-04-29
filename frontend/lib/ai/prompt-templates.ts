/**
 * AI Prompt Templates
 * 
 * Provides reusable prompt templates for AI service interactions.
 * Supports template variable substitution for dynamic content.
 * 
 * **Validates: Requirements 2.7, 3.6**
 */

import type { SummarizeOptions, QuizOptions } from "./types";

/**
 * Base summarization prompt template
 * Variables: {text}, {maxKeyPoints}
 */
const SUMMARIZE_PROMPT_TEMPLATE = `You are an expert study assistant. Your task is to create a concise summary and extract key points from the provided text.

Instructions:
1. Create a clear, comprehensive summary (2-4 sentences)
2. Extract {maxKeyPoints} key points that capture the most important concepts
3. Focus on concepts that would be valuable for studying
4. Use clear, student-friendly language
5. Return ONLY valid JSON in the exact format specified below

Text to summarize:
{text}

Return your response as JSON with this exact structure:
{
  "summary": "Your summary here",
  "keyPoints": ["Point 1", "Point 2", "Point 3"]
}`;

/**
 * Base quiz generation prompt template
 * Variables: {text}, {questionCount}, {difficulty}
 */
const QUIZ_PROMPT_TEMPLATE = `You are an expert educator creating quiz questions. Your task is to generate {questionCount} multiple-choice questions from the provided text.

Instructions:
1. Create questions that test comprehension, not just memorization
2. Each question must have exactly 4 answer options
3. Include one correct answer and three plausible distractors
4. Provide a clear explanation for why the correct answer is right
5. Vary question difficulty: {difficulty}
6. Return ONLY valid JSON in the exact format specified below

Text to create questions from:
{text}

Return your response as JSON with this exact structure:
{
  "questions": [
    {
      "question": "Your question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct"
    }
  ]
}`;

/**
 * Template variable substitution options
 */
export interface TemplateVariables {
  [key: string]: string | number;
}

/**
 * Substitute variables in a template string
 * 
 * Replaces all occurrences of {variableName} with the corresponding value.
 * 
 * @param template - Template string with {variable} placeholders
 * @param variables - Object mapping variable names to values
 * @returns Template string with variables substituted
 * 
 * @example
 * ```typescript
 * const result = substituteVariables(
 *   "Hello {name}, you are {age} years old",
 *   { name: "Alice", age: 25 }
 * );
 * // Returns: "Hello Alice, you are 25 years old"
 * ```
 */
export function substituteVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const replacement = String(value);
    result = result.split(placeholder).join(replacement);
  }
  
  return result;
}

/**
 * Generate a summarization prompt with variable substitution
 * 
 * Creates a prompt for AI text summarization with key points extraction.
 * Supports customizable maxKeyPoints parameter.
 * 
 * **Validates: Requirement 2.7**
 * 
 * @param content - Text content to summarize
 * @param options - Optional summarization parameters
 * @returns Formatted prompt string ready for AI service
 * 
 * @example
 * ```typescript
 * const prompt = generateSummarizationPrompt(
 *   "Long text to summarize...",
 *   { maxKeyPoints: 5 }
 * );
 * ```
 */
export function generateSummarizationPrompt(
  content: string,
  options?: SummarizeOptions
): string {
  const maxKeyPoints = options?.maxKeyPoints ?? 5;
  
  return substituteVariables(SUMMARIZE_PROMPT_TEMPLATE, {
    text: content,
    maxKeyPoints,
  });
}

/**
 * Generate a quiz generation prompt with variable substitution
 * 
 * Creates a prompt for AI quiz question generation with difficulty levels.
 * Supports customizable questionCount and difficulty parameters.
 * 
 * **Validates: Requirement 3.6**
 * 
 * @param content - Text content to generate quiz questions from
 * @param options - Optional quiz generation parameters
 * @returns Formatted prompt string ready for AI service
 * 
 * @example
 * ```typescript
 * const prompt = generateQuizPrompt(
 *   "Study material text...",
 *   { questionCount: 4, difficulty: "medium" }
 * );
 * ```
 */
export function generateQuizPrompt(
  content: string,
  options?: QuizOptions
): string {
  const questionCount = options?.questionCount ?? 4;
  const difficulty = options?.difficulty ?? "medium";
  
  return substituteVariables(QUIZ_PROMPT_TEMPLATE, {
    text: content,
    questionCount,
    difficulty,
  });
}

/**
 * Get the raw summarization template (for testing/inspection)
 * 
 * @returns The raw template string with placeholders
 */
export function getSummarizationTemplate(): string {
  return SUMMARIZE_PROMPT_TEMPLATE;
}

/**
 * Get the raw quiz generation template (for testing/inspection)
 * 
 * @returns The raw template string with placeholders
 */
export function getQuizTemplate(): string {
  return QUIZ_PROMPT_TEMPLATE;
}
