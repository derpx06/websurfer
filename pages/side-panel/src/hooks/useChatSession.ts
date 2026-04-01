import { useState, useCallback, useRef, useEffect } from 'react';
import { type Message, chatHistoryStore, Actors } from '@extension/storage';

export const useChatSession = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<any[]>([]);
    const [isFollowUpMode, setIsFollowUpMode] = useState(false);
    const [isHistoricalSession, setIsHistoricalSession] = useState(false);
    const sessionIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        sessionIdRef.current = currentSessionId;
    }, [currentSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const appendMessage = useCallback((newMessage: Message, sessionId?: string | null) => {
        const progressMessage = 'Showing progress...';
        setMessages(prev => {
            const filteredMessages = prev.filter((msg, idx) => !(msg.content === progressMessage && idx === prev.length - 1));
            return [...filteredMessages, newMessage];
        });

        const effectiveSessionId = sessionId !== undefined ? sessionId : sessionIdRef.current;
        if (effectiveSessionId && newMessage.content !== progressMessage) {
            chatHistoryStore.addMessage(effectiveSessionId, newMessage).catch(err =>
                console.error('Failed to save message to history:', err)
            );
        }
    }, []);

    const loadChatSessions = useCallback(async () => {
        try {
            const sessions = await chatHistoryStore.getSessionsMetadata();
            setChatSessions(sessions.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error('Failed to load chat sessions:', error);
        }
    }, []);

    const handleSessionSelect = useCallback(async (sessionId: string) => {
        try {
            const fullSession = await chatHistoryStore.getSession(sessionId);
            if (fullSession && fullSession.messages.length > 0) {
                setCurrentSessionId(fullSession.id);
                setMessages(fullSession.messages);
                setIsFollowUpMode(false);
                setIsHistoricalSession(true);
            }
            return true;
        } catch (error) {
            console.error('Failed to load session:', error);
            return false;
        }
    }, []);

    const handleSessionDelete = useCallback(async (sessionId: string) => {
        try {
            await chatHistoryStore.deleteSession(sessionId);
            await loadChatSessions();
            if (sessionId === currentSessionId) {
                setMessages([]);
                setCurrentSessionId(null);
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    }, [currentSessionId, loadChatSessions]);

    const createNewSession = useCallback(async (title: string) => {
        const newSession = await chatHistoryStore.createSession(title);
        setCurrentSessionId(newSession.id);
        sessionIdRef.current = newSession.id;
        return newSession.id;
    }, []);

    const resetSession = useCallback(() => {
        setMessages([]);
        setCurrentSessionId(null);
        sessionIdRef.current = null;
        setIsFollowUpMode(false);
        setIsHistoricalSession(false);
    }, []);

    return {
        messages,
        setMessages,
        currentSessionId,
        setCurrentSessionId,
        sessionIdRef,
        chatSessions,
        isFollowUpMode,
        setIsFollowUpMode,
        isHistoricalSession,
        setIsHistoricalSession,
        messagesEndRef,
        appendMessage,
        loadChatSessions,
        handleSessionSelect,
        handleSessionDelete,
        createNewSession,
        resetSession,
    };
};
