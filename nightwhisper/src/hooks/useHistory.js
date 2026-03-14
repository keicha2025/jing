import { useState, useEffect, useCallback } from 'react';
import { getAllSessions, getSessionChunks, getSessionEvents, deleteSession as deleteSessionFromDB } from '../utils/storage';

export const useHistory = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshSessions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllSessions();
            setSessions(data);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const downloadSession = async (session) => {
        try {
            const chunks = await getSessionChunks(session.sessionId);
            const blobs = chunks.map(c => c.blob);
            const combinedBlob = new Blob(blobs, { type: 'audio/webm' });
            const url = URL.createObjectURL(combinedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nightwhisper-${session.sessionId}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            alert('下載失敗');
        }
    };

    const getSessionUrl = async (sessionId) => {
        try {
            const chunks = await getSessionChunks(sessionId);
            const blobs = chunks.map(c => c.blob);
            const combinedBlob = new Blob(blobs, { type: 'audio/webm' });
            return URL.createObjectURL(combinedBlob);
        } catch (err) {
            console.error('Failed to get session URL:', err);
            return null;
        }
    };

    const removeSession = async (sessionId) => {
        if (!confirm('確定要刪除此筆紀錄嗎？')) return;
        try {
            await deleteSessionFromDB(sessionId);
            await refreshSessions();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    return {
        sessions,
        loading,
        refreshSessions,
        downloadSession,
        getSessionUrl,
        getSessionEvents,
        removeSession
    };
};
