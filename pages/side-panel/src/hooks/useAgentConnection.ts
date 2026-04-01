import { useCallback, useRef, useState, useEffect } from 'react';
import { Actors, type Message } from '@extension/storage';
import { EventType, type AgentEvent, ExecutionState } from '../types/event';
import { t } from '@extension/i18n';

interface UseAgentConnectionProps {
    appendMessage: (message: Message) => void;
    setIsFollowUpMode: (mode: boolean) => void;
    setInputEnabled: (enabled: boolean) => void;
    setShowStopButton: (show: boolean) => void;
    setIsReplaying: (replaying: boolean) => void;
    setIsHistoricalSession: (historical: boolean) => void;
    setIsProcessingSpeech: (processing: boolean) => void;
    setInputTextRef: React.MutableRefObject<((text: string) => void) | null>;
}

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

    const handleTaskState = useCallback((event: AgentEvent) => {
        const { actor, state, timestamp, data } = event;
        const content = data?.details;
        const progressMessage = 'Showing progress...';
        let skip = true;
        let displayProgress = false;

        switch (actor) {
            case Actors.SYSTEM:
                if (state === ExecutionState.TASK_START) setIsHistoricalSession(false);
                else if (state === ExecutionState.TASK_OK || state === ExecutionState.TASK_FAIL) {
                    setIsFollowUpMode(true);
                    setInputEnabled(true);
                    setShowStopButton(false);
                    setIsReplaying(false);
                    skip = false;
                } else if (state === ExecutionState.TASK_CANCEL) {
                    setIsFollowUpMode(false);
                    setInputEnabled(true);
                    setShowStopButton(false);
                    setIsReplaying(false);
                    skip = false;
                }
                break;
            case Actors.PLANNER:
                if (state === ExecutionState.STEP_START) displayProgress = true;
                else if (state === ExecutionState.STEP_OK || state === ExecutionState.STEP_FAIL) skip = false;
                break;
            case Actors.NAVIGATOR:
                if (state === ExecutionState.STEP_START) displayProgress = true;
                else if (state === ExecutionState.STEP_OK) displayProgress = false;
                else if (state === ExecutionState.STEP_FAIL) { skip = false; displayProgress = false; }
                else if (state === ExecutionState.ACT_START && content !== 'cache_content') skip = false;
                else if (state === ExecutionState.ACT_OK) skip = !isReplayingRef.current;
                else if (state === ExecutionState.ACT_FAIL) skip = false;
                break;
            case Actors.VALIDATOR:
                if (state === ExecutionState.STEP_START) displayProgress = true;
                else if (state === ExecutionState.STEP_OK || state === ExecutionState.STEP_FAIL) skip = false;
                break;
        }

        if (!skip) appendMessage({ actor, content: content || '', timestamp });
        if (displayProgress) appendMessage({ actor, content: progressMessage, timestamp });
    }, [appendMessage, setIsFollowUpMode, setInputEnabled, setShowStopButton, setIsReplaying, setIsHistoricalSession]);

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

            portRef.current.onDisconnect.addListener(() => {
                portRef.current = null;
                stopConnection();
                setInputEnabled(true);
                setShowStopButton(false);
            });

            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = window.setInterval(() => {
                if (portRef.current?.name === 'side-panel-connection') {
                    try { portRef.current.postMessage({ type: 'heartbeat' }); }
                    catch (e) { stopConnection(); }
                } else stopConnection();
            }, 25000);
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
