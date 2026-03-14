import { useState, useEffect, useCallback } from 'react';
import { aiEngine } from '../utils/ai-engine';
import { saveAIEvent } from '../utils/storage';

export const useAIAnalysis = (isEnabled) => {
    const [lastEvent, setLastEvent] = useState(null);
    const [isModelReady, setIsModelReady] = useState(false);

    useEffect(() => {
        if (isEnabled) {
            aiEngine.loadModel().then(() => setIsModelReady(true));
        }
    }, [isEnabled]);

    const startMonitoring = useCallback((sessionId) => {
        if (!isEnabled) return;

        aiEngine.startAnalysis((event) => {
            const eventWithSession = {
                ...event,
                sessionId: sessionId || 'preview'
            };

            if (sessionId) {
                saveAIEvent(eventWithSession);
            }

            setLastEvent(eventWithSession);
            // Auto-clear event after 3 seconds
            setTimeout(() => setLastEvent(null), 3000);
        });
    }, [isEnabled]);

    const stopMonitoring = useCallback(() => {
        aiEngine.stopAnalysis();
    }, []);

    const analyzeBatch = useCallback(async (audioBuffer, onProgress) => {
        return await aiEngine.analyzeAudioBuffer(audioBuffer, onProgress);
    }, []);

    return {
        lastEvent,
        isModelReady,
        startMonitoring,
        stopMonitoring,
        analyzeBatch
    };
};
