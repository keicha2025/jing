'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

interface TimerLog {
    taskId: string;
    projectId: string;
    taskName: string;
    projectName: string;
    startTime: number;
}

interface TimerContextType {
    activeTimer: TimerLog | null;
    elapsedTime: number; // in seconds
    startTimer: (task: { id: string, name: string }, project: { id: string, name: string }) => void;
    stopTimer: (userId: string) => Promise<void>;
    pauseTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [activeTimer, setActiveTimer] = useState<TimerLog | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeTimer) {
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - activeTimer.startTime) / 1000));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsedTime(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeTimer]);

    const startTimer = (task: { id: string, name: string }, project: { id: string, name: string }) => {
        setActiveTimer({
            taskId: task.id,
            projectId: project.id,
            taskName: task.name,
            projectName: project.name,
            startTime: Date.now(),
        });
    };

    const stopTimer = async (userId: string) => {
        if (!activeTimer) return;

        const durationSeconds = elapsedTime;
        const finalActiveTimer = activeTimer; // Capture current state

        // Clear timer first to UI feels responsive
        setActiveTimer(null);

        try {
            // 1. Add to logs subcollection
            await addDoc(collection(db, `users/${userId}/projects/${finalActiveTimer.projectId}/tasks/${finalActiveTimer.taskId}/logs`), {
                duration: durationSeconds,
                startTime: new Date(finalActiveTimer.startTime),
                endTime: serverTimestamp(),
                type: 'timer',
                createdAt: serverTimestamp(),
            });

            // 2. Update task totalTime (aggregated)
            const taskRef = doc(db, `users/${userId}/projects/${finalActiveTimer.projectId}/tasks/${finalActiveTimer.taskId}`);
            await updateDoc(taskRef, {
                totalMinutes: increment(Math.floor(durationSeconds / 60)),
                totalTime: increment(durationSeconds / 3600),
                lastLogAt: serverTimestamp()
            });

        } catch (error) {
            console.error("Error saving timer log:", error);
        }
    };

    const pauseTimer = () => {
        // For now, pause is just stop but we can implement actual pause logic later
        setActiveTimer(null);
    };

    return (
        <TimerContext.Provider value={{ activeTimer, elapsedTime, startTimer, stopTimer, pauseTimer }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}
