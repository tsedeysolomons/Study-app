"use client";

import { useEffect, useState, useCallback } from "react";

export interface StudySession {
  id: string;
  date: string;
  duration: number;
  notes: string;
}

export interface AppState {
  notes: string;
  studySessions: StudySession[];
  totalStudyTime: number;
}

const STORAGE_KEY = "smart-ai-study-assistant";

const defaultState: AppState = {
  notes: "",
  studySessions: [],
  totalStudyTime: 0,
};

export function useLocalStorage() {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch {
          setState(defaultState);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const saveState = useCallback((newState: AppState) => {
    setState(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    }
  }, []);

  const updateNotes = useCallback(
    (notes: string) => {
      const newState = { ...state, notes };
      saveState(newState);
    },
    [state, saveState]
  );

  const addSession = useCallback(
    (duration: number, notes: string) => {
      const session: StudySession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration,
        notes,
      };
      const newState = {
        ...state,
        studySessions: [...state.studySessions, session],
        totalStudyTime: state.totalStudyTime + duration,
      };
      saveState(newState);
    },
    [state, saveState]
  );

  const clearSessions = useCallback(() => {
    const newState = {
      ...state,
      studySessions: [],
      totalStudyTime: 0,
    };
    saveState(newState);
  }, [state, saveState]);

  return {
    state,
    isLoaded,
    updateNotes,
    addSession,
    clearSessions,
  };
}
