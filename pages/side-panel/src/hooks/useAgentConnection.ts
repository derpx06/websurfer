import { useCallback, useRef } from 'react';
import { Actors, type Message } from '@extension/storage';
import { EventType } from '../types/event';
import type { AgentEvent } from '../types/event';
import { t } from '@extension/i18n';
import { useAgentEventHandler } from './useAgentEventHandler';

interface UseAgentConnectionProps {
    appendMessage: (message: Message) => void;
    setIsFollowUpMode: (mode: boolean) => void;
    setInputEnabled: (enabled: boolean) => void;
    setShowStopButton: (show: boolean) => void;
    setIsReplaying: (replaying: boolean) => void;
    setIsHistoricalSession: (historical: boolean) => void;
    setIsProcessingSpeech: (processing: boolean) => void;
    setLastScreenshot: (screenshot: string | null) => void;
    setInputTextRef: React.MutableRefObject<((text: string) => void) | null>;
}

type RuntimeMessage = {
    type?: string;
    error?: string;
    text?: string;
};

/**
 * useAgentConnection manages a robust, long-lived communication channel (Chrome Port)
 * between the Side Panel and the Background Service Worker.
 * 
 * It handles:
 * - Establishing and tearing down connections.
 * - Heartbeat/keep-alive logic to prevent Service Worker hibernation.
 * - Routing specific message types (execution events, errors, speech-to-text) to their handlers.
 */
export const useAgentConnection = ({
    appendMessage,
    setIsFollowUpMode,
    setInputEnabled,
    setShowStopButton,
    setIsReplaying,
    setIsHistoricalSession,
    setIsProcessingSpeech,
    setLastScreenshot,
    setInputTextRef,
}: UseAgentConnectionProps) => {
    const portRef = useRef<chrome.runtime.Port | null>(null);
    const heartbeatIntervalRef = useRef<number | null>(null);
    const isReplayingRef = useRef<boolean>(false);

    const { handleTaskState } = useAgentEventHandler({
        appendMessage,
        setIsFollowUpMode,
        setInputEnabled,
        setShowStopButton,
        setIsReplaying,
        setIsHistoricalSession,
        setLastScreenshot,
        isReplayingRef
    });

    const stopConnection = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        if (portRef.current) {
            portRef.current.disconnect();
            portRef.current = null;
        }
    }, []);

    const setupConnection = useCallback(() => {
        if (portRef.current) return;
        try {
            portRef.current = chrome.runtime.connect({ name: 'side-panel-connection' });
            portRef.current.onMessage.addListener((message: unknown) => {
                const runtimeMessage = (message ?? {}) as RuntimeMessage;
                if (runtimeMessage.type === EventType.EXECUTION) handleTaskState(message as AgentEvent);
                else if (runtimeMessage.type === 'error') {
                    appendMessage({ actor: Actors.SYSTEM, content: runtimeMessage.error || t('errors_unknown'), timestamp: Date.now() });
                    setInputEnabled(true);
                    setShowStopButton(false);
                } else if (runtimeMessage.type === 'speech_to_text_result') {
                    if (runtimeMessage.text && setInputTextRef.current) setInputTextRef.current(runtimeMessage.text);
                    setIsProcessingSpeech(false);
                } else if (runtimeMessage.type === 'speech_to_text_error') {
                    appendMessage({ actor: Actors.SYSTEM, content: runtimeMessage.error || t('chat_stt_recognitionFailed'), timestamp: Date.now() });
                    setIsProcessingSpeech(false);
                }
            });

            // Recovery: Handle unexpected connection termination by cleaning up the interval
            portRef.current.onDisconnect.addListener(() => {
                portRef.current = null;
                stopConnection();
                // Reset UI to allow user to retry
                setInputEnabled(true);
                setShowStopButton(false);
            });

            // Keep-Alive Loop: Service Workers in MV3 are ephemeral. 
            // Injects a periodic 'heartbeat' message to ensure the worker stays active during long tasks.
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = window.setInterval(() => {
                if (portRef.current?.name === 'side-panel-connection') {
                    try { portRef.current.postMessage({ type: 'heartbeat' }); }
                    catch (e) { stopConnection(); }
                } else stopConnection();
            }, 25000); // 25s window (Chrome hibernation threshold is ~30s)
        } catch (error) {
            appendMessage({ actor: Actors.SYSTEM, content: t('errors_conn_serviceWorker'), timestamp: Date.now() });
            portRef.current = null;
        }
    }, [handleTaskState, appendMessage, stopConnection, setInputEnabled, setShowStopButton, setIsProcessingSpeech, setInputTextRef]);

    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (portRef.current?.name !== 'side-panel-connection') throw new Error('No valid connection available');
        portRef.current.postMessage(message);
    }, []);

    return { portRef, isReplayingRef, setupConnection, stopConnection, sendMessage };
};
