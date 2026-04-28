"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Copy, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { summarizeText, type SummaryResult } from "@/lib/ai";

interface SummarizerSectionProps {
  initialNotes: string;
}

export function SummarizerSection({ initialNotes }: SummarizerSectionProps) {
  const [inputText, setInputText] = useState(initialNotes);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to summarize");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const summary = await summarizeText(inputText);
      setResult(summary);
    } catch {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `Summary:\n${result.summary}\n\nKey Points:\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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
            <div className="rounded-lg bg-chart-2/10 p-2.5">
              <Brain className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Input Text</CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste or type your notes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter the text you want to summarize..."
            className="min-h-[300px] resize-none border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            onClick={handleSummarize}
            disabled={isLoading || !inputText.trim()}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Summarize
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-generated insights
              </p>
            </div>
          </div>
          {result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isCopied ? "Copied" : "Copy"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-[300px] flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Analyzing your notes...
                </p>
              </motion.div>
            )}

            {!isLoading && !error && !result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-[300px] flex-col items-center justify-center text-center"
              >
                <Brain className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Enter text and click Summarize to get started
                </p>
              </motion.div>
            )}

            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-lg bg-secondary/30 p-4">
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.summary}
                  </p>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    Key Points
                  </h4>
                  <ul className="space-y-2">
                    {result.keyPoints.map((point, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
