"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { generateQuestions, type QuizQuestion } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface QuizSectionProps {
  initialNotes: string;
}

export function QuizSection({ initialNotes }: QuizSectionProps) {
  const [inputText, setInputText] = useState(initialNotes);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  const handleGenerateQuiz = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    try {
      const generatedQuestions = await generateQuestions(inputText);
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setQuizStarted(true);
    } catch {
      console.error("Failed to generate questions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const quizComplete = isLastQuestion && showResult;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-6 lg:grid-cols-2"
    >
      {/* Input Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-chart-3/10 p-2.5">
              <HelpCircle className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Quiz Generator
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Test your knowledge
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your study material to generate quiz questions..."
            className="min-h-[200px] resize-none border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            onClick={handleGenerateQuiz}
            disabled={isLoading || !inputText.trim()}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quiz Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Quiz</CardTitle>
              {quizStarted && (
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              )}
            </div>
          </div>
          {quizStarted && (
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Score: {score}/{questions.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {!quizStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-[300px] flex-col items-center justify-center text-center"
              >
                <HelpCircle className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Enter text and generate a quiz to test your knowledge
                </p>
              </motion.div>
            )}

            {quizStarted && quizComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">
                  Quiz Complete!
                </h3>
                <p className="mb-6 text-lg text-muted-foreground">
                  You scored {score} out of {questions.length}
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleRestart} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={() => setQuizStarted(false)} className="gap-2">
                    New Quiz
                  </Button>
                </div>
              </motion.div>
            )}

            {quizStarted && !quizComplete && currentQuestion && (
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Question */}
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-foreground">{currentQuestion.question}</p>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const showCorrect = showResult && isCorrect;
                    const showIncorrect = showResult && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        whileHover={!showResult ? { scale: 1.01 } : {}}
                        whileTap={!showResult ? { scale: 0.99 } : {}}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                          !showResult && isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border/50 bg-secondary/20",
                          showCorrect && "border-primary bg-primary/10",
                          showIncorrect && "border-destructive bg-destructive/10",
                          !showResult && "hover:border-primary/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                            isSelected && !showResult
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground",
                            showCorrect && "border-primary bg-primary text-primary-foreground",
                            showIncorrect && "border-destructive bg-destructive text-destructive-foreground"
                          )}
                        >
                          {showCorrect ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : showIncorrect ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm",
                            showCorrect && "text-primary font-medium",
                            showIncorrect && "text-destructive"
                          )}
                        >
                          {option}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-muted/50 p-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Explanation:{" "}
                      </span>
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  {!showResult ? (
                    <Button
                      onClick={handleCheckAnswer}
                      disabled={selectedAnswer === null}
                      className="gap-2"
                    >
                      Check Answer
                    </Button>
                  ) : (
                    <Button onClick={handleNextQuestion} className="gap-2">
                      {isLastQuestion ? "See Results" : "Next Question"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
