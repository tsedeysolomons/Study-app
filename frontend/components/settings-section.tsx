"use client";

import { motion } from "framer-motion";
import { Settings, Moon, Sun, Palette, Bell, Shield, Info } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function SettingsSection() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Appearance */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-chart-5/10 p-2.5">
              <Palette className="h-5 w-5 text-chart-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Appearance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize how the app looks
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-chart-2/10 p-2.5">
              <Bell className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Notifications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Study Reminders</p>
              <p className="text-sm text-muted-foreground">
                Get reminded to take breaks
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Session Complete</p>
              <p className="text-sm text-muted-foreground">
                Notify when timer ends
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Daily Summary</p>
              <p className="text-sm text-muted-foreground">
                Receive daily study stats
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Privacy</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your data and privacy settings
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Local Storage</p>
              <p className="text-sm text-muted-foreground">
                All data is stored locally on your device
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Enabled
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Analytics</p>
              <p className="text-sm text-muted-foreground">
                Help improve the app
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-chart-3/10 p-2.5">
              <Info className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">About</CardTitle>
              <p className="text-sm text-muted-foreground">
                Smart AI Study Assistant
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework</span>
                <span className="text-foreground">Next.js</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Ready</span>
                <span className="text-primary">Yes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
