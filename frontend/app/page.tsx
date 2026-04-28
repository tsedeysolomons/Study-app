"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { DashboardCards } from "@/components/dashboard-cards";
import { NotesSection } from "@/components/notes-section";
import { SummarizerSection } from "@/components/summarizer-section";
import { QuizSection } from "@/components/quiz-section";
import { StudyTracker } from "@/components/study-tracker";
import { SettingsSection } from "@/components/settings-section";
import { useLocalStorage } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const sectionTitles: Record<string, string> = {
  dashboard: "Dashboard",
  notes: "Notes",
  summarizer: "AI Summarizer",
  quiz: "Quiz Generator",
  tracker: "Study Tracker",
  settings: "Settings",
};

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { state, isLoaded, updateNotes, addSession, clearSessions } =
    useLocalStorage();

  // Close sidebar on section change (mobile)
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  // Skeleton loading
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading your study data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AppSidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-64">
        <AppHeader
          onToggleSidebar={() => setIsSidebarOpen(true)}
          title={sectionTitles[activeSection] || "Dashboard"}
        />

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === "dashboard" && (
                <DashboardCards
                  totalStudyTime={state.totalStudyTime}
                  sessionsCount={state.studySessions.length}
                  notesLength={state.notes.length}
                  onNavigate={handleSectionChange}
                />
              )}

              {activeSection === "notes" && (
                <NotesSection notes={state.notes} onUpdateNotes={updateNotes} />
              )}

              {activeSection === "summarizer" && (
                <SummarizerSection initialNotes={state.notes} />
              )}

              {activeSection === "quiz" && (
                <QuizSection initialNotes={state.notes} />
              )}

              {activeSection === "tracker" && (
                <StudyTracker
                  sessions={state.studySessions}
                  totalStudyTime={state.totalStudyTime}
                  onAddSession={addSession}
                  onClearSessions={clearSessions}
                />
              )}

              {activeSection === "settings" && <SettingsSection />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-around p-2">
            {["dashboard", "notes", "summarizer", "quiz", "tracker"].map(
              (section) => (
                <button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors ${
                    activeSection === section
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="capitalize">
                    {section === "summarizer" ? "AI" : section.slice(0, 5)}
                  </span>
                </button>
              )
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
