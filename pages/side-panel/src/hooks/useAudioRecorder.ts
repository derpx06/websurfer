import { useState, useCallback, useRef, useEffect } from 'react';
import { t } from '@extension/i18n';
import { type Message, Actors } from '@extension/storage';

interface UseAudioRecorderProps {
    appendMessage: (message: Message) => void;
    setupConnection: () => void;
    portRef: React.MutableRefObject<chrome.runtime.Port | null>;
    setIsProcessingSpeech: (processing: boolean) => void;
}

export const useAudioRecorder = ({
    appendMessage,
    setupConnection,
    portRef,
    setIsProcessingSpeech,
}: UseAudioRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);

    const handleMicClick = useCallback(async () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) {
                clearTimeout(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
            setIsRecording(false);
            return;
        }

        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

            if (permissionStatus.state === 'denied') {
                appendMessage({
                    actor: Actors.SYSTEM,
                    content: t('chat_stt_microphone_permissionDenied'),
                    timestamp: Date.now(),
                });
                return;
            }

            if (permissionStatus.state !== 'granted') {
                const permissionUrl = chrome.runtime.getURL('permission/index.html');
                chrome.windows.create({
                    url: permissionUrl,
                    type: 'popup',
                    width: 500,
                    height: 600,
                }, createdWindow => {
                    if (createdWindow?.id) {
                        chrome.windows.onRemoved.addListener(function onWindowClose(windowId) {
                            if (windowId === createdWindow.id) {
                                chrome.windows.onRemoved.removeListener(onWindowClose);
                                setTimeout(async () => {
                                    try {
                                        const newPermissionStatus = await navigator.permissions.query({
                                            name: 'microphone' as PermissionName,
                                        });
                                        if (newPermissionStatus.state === 'granted') {
                                            handleMicClick();
                                        }
                                    } catch (error) {
                                        console.error('Failed to check permission status:', error);
                                    }
                                }, 500);
                            }
                        });
                    }
                });
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Audio = reader.result as string;
                        if (!portRef.current) {
                            setupConnection();
                        }
                        try {
                            setIsProcessingSpeech(true);
                            portRef.current?.postMessage({
                                type: 'speech_to_text',
                                audio: base64Audio,
                            });
                        } catch (error) {
                            console.error('Failed to send audio for speech-to-text:', error);
                            appendMessage({
                                actor: Actors.SYSTEM,
                                content: t('chat_stt_processingFailed'),
                                timestamp: Date.now(),
                            });
                            setIsRecording(false);
                            setIsProcessingSpeech(false);
                        }
                    };
                    reader.readAsDataURL(audioBlob);
                }
            };

            const maxDuration = 2 * 60 * 1000;
            recordingTimerRef.current = window.setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
                setIsRecording(false);
                setIsProcessingSpeech(true);
                recordingTimerRef.current = null;
            }, maxDuration);

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            let errorMessage = t('chat_stt_microphone_accessFailed');
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') errorMessage += t('chat_stt_microphone_grantPermission');
                else if (error.name === 'NotFoundError') errorMessage += t('chat_stt_microphone_notFound');
                else errorMessage += error.message;
            }
            appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
            setIsRecording(false);
        }
    }, [appendMessage, isRecording, setupConnection, portRef, setIsProcessingSpeech]);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) {
                clearTimeout(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        };
    }, []);

    return { isRecording, handleMicClick };
};
