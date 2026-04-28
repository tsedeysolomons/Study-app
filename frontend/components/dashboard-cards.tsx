"use client";

import { motion } from "framer-motion";
import { FileText, Brain, HelpCircle, Timer, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudySession } from "@/lib/store";

interface DashboardCardsProps {
  totalStudyTime: number;
  sessionsCount: number;
  notesLength: number;
  onNavigate: (section: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function DashboardCards({
  totalStudyTime,
  sessionsCount,
  notesLength,
  onNavigate,
}: DashboardCardsProps) {
  const stats = [
    {
      title: "Total Study Time",
      value: formatTime(totalStudyTime),
      icon: Clock,
      trend: "+12%",
      trendUp: true,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Study Sessions",
      value: sessionsCount.toString(),
      icon: Timer,
      trend: "+3",
      trendUp: true,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Notes Saved",
      value: notesLength > 0 ? `${Math.floor(notesLength / 100)}+` : "0",
      icon: FileText,
      trend: "chars",
      trendUp: true,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Quizzes Generated",
      value: "0",
      icon: HelpCircle,
      trend: "Start now",
      trendUp: false,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  const quickActions = [
    {
      title: "Take Notes",
      description: "Capture your study material",
      icon: FileText,
      section: "notes",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Summarize",
      description: "Get AI-powered summaries",
      icon: Brain,
      section: "summarizer",
      color: "bg-chart-2/10 text-chart-2",
    },
    {
      title: "Generate Quiz",
      description: "Test your knowledge",
      icon: HelpCircle,
      section: "quiz",
      color: "bg-chart-3/10 text-chart-3",
    },
    {
      title: "Track Progress",
      description: "Monitor study time",
      icon: Timer,
      section: "tracker",
      color: "bg-chart-4/10 text-chart-4",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-lg p-2.5 ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    {stat.trendUp && stat.trend !== "chars" && stat.trend !== "Start now" && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <TrendingUp className="h-3 w-3" />
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.title}
                    onClick={() => onNavigate(action.section)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/50"
                  >
                    <div className={`rounded-xl p-3 ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
