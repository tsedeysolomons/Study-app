"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Save, Trash2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NotesSectionProps {
  notes: string;
  onUpdateNotes: (notes: string) => void;
}

export function NotesSection({ notes, onUpdateNotes }: NotesSectionProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSave = () => {
    onUpdateNotes(localNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localNotes);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    setLocalNotes("");
  };

  const wordCount = localNotes.trim() ? localNotes.trim().split(/\s+/).length : 0;
  const charCount = localNotes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Capture your study material
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!localNotes}
              className="gap-2"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!localNotes}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="gap-2"
              disabled={localNotes === notes}
            >
              {isSaved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaved ? "Saved!" : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Start typing your notes here... Paste lecture content, textbook excerpts, or any study material you want to work with."
            className="min-h-[400px] resize-none border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
            <span className="text-xs">
              Pro tip: Add detailed notes for better AI summaries and quizzes
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
