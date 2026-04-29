/**
 * OpenAI Provider Implementation
 * 
 * Implements the AIProvider interface for OpenAI's GPT models.
 * Provides text summarization and quiz generation with JSON response format.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */

import OpenAI from "openai";
import type {
  AIProvider,
  AIConfig,
  SummarizeOptions,
  SummaryResult,
  QuizOptions,
  QuizResult,
} from "./types";

/**
 * Prompt template for text summarization
 * Instructs the AI to create a summary and extract key points
 */
const SUMMARIZE_PROMPT = `You are an expert study assistant. Your task is to create a concise summary and extract key points from the provided text.

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
 * Prompt template for quiz generation
 * Instructs the AI to create multiple-choice questions
 */
const QUIZ_PROMPT = `You are an expert educator creating quiz questions. Your task is to generate {questionCount} multiple-choice questions from the provided text.

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
 * OpenAI Provider Implementation
 * 
 * Implements the AIProvider interface using OpenAI's GPT models.
 * Supports GPT-4 and GPT-3.5-turbo with JSON response format.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private model: string;

  /**
   * Create a new OpenAI provider instance
   * 
   * @param config - AI configuration with API key and model settings
   */
  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 15000,
      maxRetries: 1,
    });
    this.model = config.model || "gpt-4";
  }

  /**
   * Generate a summary and key points from input text
   * 
   * Uses OpenAI's chat completion API with JSON response format.
   * Temperature is set low (0.3) for consistent, factual summaries.
   * 
   * **Validates: Requirement 2.1**
   * 
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Summary result with metadata
   * @throws {Error} If OpenAI API call fails or returns invalid response
   */
  async summarize(
    text: string,
    options?: SummarizeOptions
  ): Promise<SummaryResult> {
    const prompt = this.buildSummarizePrompt(text, options);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert study assistant. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      metadata: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: this.model,
        cached: false,
        processingTime: 0, // Set by adapter
      },
    };
  }

  /**
   * Generate quiz questions from input text
   * 
   * Uses OpenAI's chat completion API with JSON response format.
   * Temperature is set moderate (0.5) for creative but consistent questions.
   * Adds unique IDs to each question for tracking.
   * 
   * **Validates: Requirement 3.1**
   * 
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Quiz result with questions and metadata
   * @throws {Error} If OpenAI API call fails or returns invalid response
   */
  async generateQuiz(
    text: string,
    options?: QuizOptions
  ): Promise<QuizResult> {
    const prompt = this.buildQuizPrompt(text, options);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert educator. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.5,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    // Add unique IDs to questions (Requirement 3.10)
    const questions = parsed.questions.map((q: any, index: number) => ({
      ...q,
      id: `${Date.now()}-${index}`,
    }));

    return {
      questions,
      metadata: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: this.model,
        cached: false,
        processingTime: 0, // Set by adapter
      },
    };
  }

  /**
   * Count tokens in input text
   * 
   * Uses a simple approximation: 4 characters ≈ 1 token for English text.
   * This is sufficient for token budget enforcement.
   * 
   * **Validates: Requirement 4.2**
   * 
   * @param text - Text to count tokens for
   * @returns Approximate token count
   */
  countTokens(text: string): number {
    // Approximate token count (4 chars ≈ 1 token for English)
    return Math.ceil(text.length / 4);
  }

  /**
   * Build summarization prompt from template
   * 
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Formatted prompt string
   */
  private buildSummarizePrompt(
    text: string,
    options?: SummarizeOptions
  ): string {
    const maxKeyPoints = options?.maxKeyPoints || 5;
    return SUMMARIZE_PROMPT.replace("{text}", text).replace(
      "{maxKeyPoints}",
      maxKeyPoints.toString()
    );
  }

  /**
   * Build quiz generation prompt from template
   * 
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Formatted prompt string
   */
  private buildQuizPrompt(text: string, options?: QuizOptions): string {
    const questionCount = options?.questionCount || 4;
    const difficulty = options?.difficulty || "medium";
    return QUIZ_PROMPT.replace("{text}", text)
      .replace("{questionCount}", questionCount.toString())
      .replace("{difficulty}", difficulty);
  }
}
