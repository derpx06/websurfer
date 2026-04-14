import { useCallback, useRef } from 'react';
import { Actors } from '@extension/storage';
import { EventType } from '../types/event';
import { t } from '@extension/i18n';
import { useAgentEventHandler } from './useAgentEventHandler';

interface UseAgentConnectionProps {
    appendMessage: (message: any) => void;
    setIsFollowUpMode: (mode: boolean) => void;
    setInputEnabled: (enabled: boolean) => void;
    setShowStopButton: (show: boolean) => void;
    setIsReplaying: (replaying: boolean) => void;
    setIsHistoricalSession: (historical: boolean) => void;
    setIsProcessingSpeech: (processing: boolean) => void;
    setInputTextRef: React.MutableRefObject<((text: string) => void) | null>;
}

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
            portRef.current.onMessage.addListener((message: any) => {
                if (message?.type === EventType.EXECUTION) handleTaskState(message);
                else if (message?.type === 'error') {
                    appendMessage({ actor: Actors.SYSTEM, content: message.error || t('errors_unknown'), timestamp: Date.now() });
                    setInputEnabled(true);
                    setShowStopButton(false);
                } else if (message?.type === 'speech_to_text_result') {
                    if (message.text && setInputTextRef.current) setInputTextRef.current(message.text);
                    setIsProcessingSpeech(false);
                } else if (message?.type === 'speech_to_text_error') {
                    appendMessage({ actor: Actors.SYSTEM, content: message.error || t('chat_stt_recognitionFailed'), timestamp: Date.now() });
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

    const sendMessage = useCallback((message: any) => {
        if (portRef.current?.name !== 'side-panel-connection') throw new Error('No valid connection available');
        portRef.current.postMessage(message);
    }, []);

    return { portRef, isReplayingRef, setupConnection, stopConnection, sendMessage };
};
