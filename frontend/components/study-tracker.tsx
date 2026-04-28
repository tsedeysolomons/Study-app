"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Save,
  Clock,
  TrendingUp,
  Calendar,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StudySession } from "@/lib/store";

interface StudyTrackerProps {
  sessions: StudySession[];
  totalStudyTime: number;
  onAddSession: (duration: number, notes: string) => void;
  onClearSessions: () => void;
}

export function StudyTracker({
  sessions,
  totalStudyTime,
  onAddSession,
  onClearSessions,
}: StudyTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [sessionNote, setSessionNote] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const formatShortTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const handleSaveSession = () => {
    if (time > 0) {
      onAddSession(time, sessionNote || "Study session");
      setTime(0);
      setIsRunning(false);
      setSessionNote("");
    }
  };

  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date);
    const today = new Date();
    return sessionDate.toDateString() === today.toDateString();
  });

  const todayTime = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-6 lg:grid-cols-3"
    >
      {/* Timer Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-chart-4/10 p-2.5">
              <Timer className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Study Timer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your study sessions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              className="relative"
              animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-primary/20 bg-card">
                <span className="font-mono text-4xl font-bold text-foreground">
                  {formatTime(time)}
                </span>
              </div>
              {isRunning && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              )}
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={handleStartPause}
              size="lg"
              className="h-14 w-14 rounded-full p-0"
            >
              {isRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="ml-1 h-6 w-6" />
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="h-14 w-14 rounded-full p-0"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleSaveSession}
              variant="outline"
              size="lg"
              disabled={time === 0}
              className="h-14 w-14 rounded-full p-0"
            >
              <Save className="h-5 w-5" />
            </Button>
          </div>

          {/* Session Note */}
          <div className="mx-auto max-w-sm">
            <input
              type="text"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Add a note for this session..."
              className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <div className="space-y-6">
        {/* Quick Stats */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Time</span>
              </div>
              <span className="font-semibold text-foreground">
                {formatShortTime(totalStudyTime)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-chart-2/10 p-2">
                  <Calendar className="h-4 w-4 text-chart-2" />
                </div>
                <span className="text-sm text-muted-foreground">Today</span>
              </div>
              <span className="font-semibold text-foreground">
                {formatShortTime(todayTime)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-chart-3/10 p-2">
                  <TrendingUp className="h-4 w-4 text-chart-3" />
                </div>
                <span className="text-sm text-muted-foreground">Sessions</span>
              </div>
              <span className="font-semibold text-foreground">
                {sessions.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Sessions</CardTitle>
            {sessions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSessions}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Timer className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No sessions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .slice(-5)
                    .reverse()
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {session.notes}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.date)}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {formatShortTime(session.duration)}
                        </span>
                      </motion.div>
                    ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
