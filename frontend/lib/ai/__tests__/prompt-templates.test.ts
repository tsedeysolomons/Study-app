/**
 * Unit tests for Prompt Templates
 * 
 * Tests the prompt template generation and variable substitution:
 * - Template variable substitution logic
 * - Summarization prompt generation
 * - Quiz generation prompt generation
 * - Default parameter handling
 * - Edge cases and special characters
 */

import { describe, it, expect } from "@jest/globals";
import {
  substituteVariables,
  generateSummarizationPrompt,
  generateQuizPrompt,
  getSummarizationTemplate,
  getQuizTemplate,
} from "../prompt-templates";

describe("Prompt Templates", () => {
  describe("substituteVariables", () => {
    it("should substitute a single variable", () => {
      const template = "Hello {name}!";
      const result = substituteVariables(template, { name: "Alice" });
      expect(result).toBe("Hello Alice!");
    });

    it("should substitute multiple variables", () => {
      const template = "Hello {name}, you are {age} years old";
      const result = substituteVariables(template, { name: "Bob", age: 25 });
      expect(result).toBe("Hello Bob, you are 25 years old");
    });

    it("should substitute the same variable multiple times", () => {
      const template = "{name} said: 'My name is {name}'";
      const result = substituteVariables(template, { name: "Charlie" });
      expect(result).toBe("Charlie said: 'My name is Charlie'");
    });

    it("should handle numeric values", () => {
      const template = "Count: {count}, Price: {price}";
      const result = substituteVariables(template, { count: 42, price: 19.99 });
      expect(result).toBe("Count: 42, Price: 19.99");
    });

    it("should handle zero values", () => {
      const template = "Value: {value}";
      const result = substituteVariables(template, { value: 0 });
      expect(result).toBe("Value: 0");
    });

    it("should handle empty string values", () => {
      const template = "Text: '{text}'";
      const result = substituteVariables(template, { text: "" });
      expect(result).toBe("Text: ''");
    });

    it("should leave unmatched placeholders unchanged", () => {
      const template = "Hello {name}, your ID is {id}";
      const result = substituteVariables(template, { name: "Dave" });
      expect(result).toBe("Hello Dave, your ID is {id}");
    });

    it("should handle templates with no variables", () => {
      const template = "This is a plain text template";
      const result = substituteVariables(template, { unused: "value" });
      expect(result).toBe("This is a plain text template");
    });

    it("should handle empty template", () => {
      const template = "";
      const result = substituteVariables(template, { name: "Eve" });
      expect(result).toBe("");
    });

    it("should handle empty variables object", () => {
      const template = "Hello {name}!";
      const result = substituteVariables(template, {});
      expect(result).toBe("Hello {name}!");
    });

    it("should handle special characters in values", () => {
      const template = "Message: {msg}";
      const result = substituteVariables(template, {
        msg: "Hello! @#$%^&*() <script>alert('xss')</script>",
      });
      expect(result).toBe(
        "Message: Hello! @#$%^&*() <script>alert('xss')</script>"
      );
    });

    it("should handle newlines in values", () => {
      const template = "Text:\n{content}";
      const result = substituteVariables(template, {
        content: "Line 1\nLine 2\nLine 3",
      });
      expect(result).toBe("Text:\nLine 1\nLine 2\nLine 3");
    });

    it("should handle curly braces in values", () => {
      const template = "Code: {code}";
      const result = substituteVariables(template, {
        code: "function() { return {x: 1}; }",
      });
      expect(result).toBe("Code: function() { return {x: 1}; }");
    });
  });

  describe("generateSummarizationPrompt", () => {
    it("should generate prompt with default maxKeyPoints", () => {
      const content = "This is a test text for summarization.";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt).toContain("5 key points"); // default maxKeyPoints
      expect(prompt).toContain("expert study assistant");
      expect(prompt).toContain('"summary"');
      expect(prompt).toContain('"keyPoints"');
    });

    it("should generate prompt with custom maxKeyPoints", () => {
      const content = "Test content";
      const prompt = generateSummarizationPrompt(content, { maxKeyPoints: 7 });

      expect(prompt).toContain(content);
      expect(prompt).toContain("7 key points");
    });

    it("should generate prompt with minimum maxKeyPoints", () => {
      const content = "Test content";
      const prompt = generateSummarizationPrompt(content, { maxKeyPoints: 3 });

      expect(prompt).toContain(content);
      expect(prompt).toContain("3 key points");
    });

    it("should handle long content", () => {
      const content = "a".repeat(5000);
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt.length).toBeGreaterThan(5000);
    });

    it("should handle content with special characters", () => {
      const content = "Test with special chars: @#$%^&*() <html></html>";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain(content);
    });

    it("should handle content with newlines", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should handle empty content", () => {
      const content = "";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain("Text to summarize:\n");
      expect(prompt).toContain("5 key points");
    });

    it("should include JSON format instructions", () => {
      const content = "Test";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain("Return your response as JSON");
      expect(prompt).toContain('"summary"');
      expect(prompt).toContain('"keyPoints"');
    });

    it("should include study-focused instructions", () => {
      const content = "Test";
      const prompt = generateSummarizationPrompt(content);

      expect(prompt).toContain("study assistant");
      expect(prompt).toContain("valuable for studying");
      expect(prompt).toContain("student-friendly");
    });

    it("should respect temperature option (pass-through)", () => {
      const content = "Test";
      // Temperature is not used in prompt generation, but should not cause errors
      const prompt = generateSummarizationPrompt(content, {
        maxKeyPoints: 5,
        temperature: 0.7,
      });

      expect(prompt).toContain(content);
      expect(prompt).toContain("5 key points");
    });
  });

  describe("generateQuizPrompt", () => {
    it("should generate prompt with default options", () => {
      const content = "This is test content for quiz generation.";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt).toContain("4 multiple-choice questions"); // default questionCount
      expect(prompt).toContain("medium"); // default difficulty
      expect(prompt).toContain("expert educator");
      expect(prompt).toContain('"questions"');
    });

    it("should generate prompt with custom questionCount", () => {
      const content = "Test content";
      const prompt = generateQuizPrompt(content, { questionCount: 5 });

      expect(prompt).toContain(content);
      expect(prompt).toContain("5 multiple-choice questions");
    });

    it("should generate prompt with custom difficulty - easy", () => {
      const content = "Test content";
      const prompt = generateQuizPrompt(content, { difficulty: "easy" });

      expect(prompt).toContain(content);
      expect(prompt).toContain("easy");
    });

    it("should generate prompt with custom difficulty - hard", () => {
      const content = "Test content";
      const prompt = generateQuizPrompt(content, { difficulty: "hard" });

      expect(prompt).toContain(content);
      expect(prompt).toContain("hard");
    });

    it("should generate prompt with all custom options", () => {
      const content = "Test content";
      const prompt = generateQuizPrompt(content, {
        questionCount: 3,
        difficulty: "hard",
      });

      expect(prompt).toContain(content);
      expect(prompt).toContain("3 multiple-choice questions");
      expect(prompt).toContain("hard");
    });

    it("should handle long content", () => {
      const content = "b".repeat(5000);
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt.length).toBeGreaterThan(5000);
    });

    it("should handle content with special characters", () => {
      const content = "Test with special chars: @#$%^&*() <html></html>";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain(content);
    });

    it("should handle content with newlines", () => {
      const content = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain(content);
    });

    it("should handle empty content", () => {
      const content = "";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain("Text to create questions from:\n");
      expect(prompt).toContain("4 multiple-choice questions");
    });

    it("should include JSON format instructions", () => {
      const content = "Test";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain("Return your response as JSON");
      expect(prompt).toContain('"questions"');
      expect(prompt).toContain('"question"');
      expect(prompt).toContain('"options"');
      expect(prompt).toContain('"correctAnswer"');
      expect(prompt).toContain('"explanation"');
    });

    it("should include comprehension-focused instructions", () => {
      const content = "Test";
      const prompt = generateQuizPrompt(content);

      expect(prompt).toContain("test comprehension");
      expect(prompt).toContain("not just memorization");
      expect(prompt).toContain("exactly 4 answer options");
      expect(prompt).toContain("plausible distractors");
    });

    it("should respect temperature option (pass-through)", () => {
      const content = "Test";
      // Temperature is not used in prompt generation, but should not cause errors
      const prompt = generateQuizPrompt(content, {
        questionCount: 4,
        difficulty: "medium",
        temperature: 0.8,
      });

      expect(prompt).toContain(content);
      expect(prompt).toContain("4 multiple-choice questions");
    });
  });

  describe("getSummarizationTemplate", () => {
    it("should return the raw template with placeholders", () => {
      const template = getSummarizationTemplate();

      expect(template).toContain("{text}");
      expect(template).toContain("{maxKeyPoints}");
      expect(template).toContain("expert study assistant");
      expect(template).toContain('"summary"');
      expect(template).toContain('"keyPoints"');
    });

    it("should return a non-empty string", () => {
      const template = getSummarizationTemplate();
      expect(template.length).toBeGreaterThan(0);
    });
  });

  describe("getQuizTemplate", () => {
    it("should return the raw template with placeholders", () => {
      const template = getQuizTemplate();

      expect(template).toContain("{text}");
      expect(template).toContain("{questionCount}");
      expect(template).toContain("{difficulty}");
      expect(template).toContain("expert educator");
      expect(template).toContain('"questions"');
    });

    it("should return a non-empty string", () => {
      const template = getQuizTemplate();
      expect(template.length).toBeGreaterThan(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should generate different prompts for different content", () => {
      const content1 = "Content about biology";
      const content2 = "Content about mathematics";

      const prompt1 = generateSummarizationPrompt(content1);
      const prompt2 = generateSummarizationPrompt(content2);

      expect(prompt1).not.toBe(prompt2);
      expect(prompt1).toContain("biology");
      expect(prompt2).toContain("mathematics");
    });

    it("should generate different prompts for different options", () => {
      const content = "Same content";

      const prompt1 = generateQuizPrompt(content, { difficulty: "easy" });
      const prompt2 = generateQuizPrompt(content, { difficulty: "hard" });

      expect(prompt1).not.toBe(prompt2);
      expect(prompt1).toContain("easy");
      expect(prompt2).toContain("hard");
    });

    it("should handle realistic study content", () => {
      const content = `
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        It occurs in the chloroplasts and involves two main stages: light-dependent reactions
        and the Calvin cycle. The overall equation is: 6CO2 + 6H2O + light → C6H12O6 + 6O2.
      `;

      const summaryPrompt = generateSummarizationPrompt(content, {
        maxKeyPoints: 4,
      });
      const quizPrompt = generateQuizPrompt(content, {
        questionCount: 3,
        difficulty: "medium",
      });

      expect(summaryPrompt).toContain("Photosynthesis");
      expect(summaryPrompt).toContain("4 key points");
      expect(quizPrompt).toContain("Photosynthesis");
      expect(quizPrompt).toContain("3 multiple-choice questions");
      expect(quizPrompt).toContain("medium");
    });
  });
});
