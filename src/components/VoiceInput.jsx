import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Play, Pause, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import csrfManager from '../utils/csrfManager';

/**
 * VoiceInput Component
 * Allows user to record audio, preview it, and transcribe it using the ML backend.
 * @param {function} onTranscribe - Callback function receiving the transcribed text string.
 */
const VoiceInput = ({ onTranscribe }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const audioRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioURL(url);
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic Error:", err);
            toast.error("Microphone access denied. Check browser permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // Stop all tracks to release mic
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const handleTranscribe = async () => {
        if (!audioBlob) return;
        setIsTranscribing(true);

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
            const response = await csrfManager.secureFetch("http://localhost:5000/api/ml/transcribe-audio/", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.text) {
                onTranscribe(data.text);
                toast.success("Voice Transcribed!", { icon: '🎙️' });
            } else {
                throw new Error(data.error || "Transcription Failed");
            }

        } catch (err) {
            console.error("Transcription Error:", err);
            toast.error("AI Transcription Failed");
        } finally {
            setIsTranscribing(false);
        }
    };

    const resetRecording = () => {
        setAudioURL(null);
        setAudioBlob(null);
        setAudioURL(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-xl border border-indigo-100 dark:border-gray-700 mb-4 transition-all">
            <h4 className="text-xs font-bold uppercase text-indigo-500 mb-3 flex items-center gap-2">
                <Mic size={14} /> AI Voice Input
            </h4>

            <div className="flex items-center gap-3">
                {!audioBlob ? (
                    !isRecording ? (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-bold shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                        >
                            <Mic size={16} className="text-red-500" /> Record
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold shadow-md animate-pulse"
                        >
                            <Square size={16} fill="currentColor" /> Stop
                        </button>
                    )
                ) : (
                    <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in duration-200">
                        {/* Custom Mini Player */}
                        <audio
                            ref={audioRef}
                            src={audioURL}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={togglePlayback}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition"
                        >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>

                        <button
                            type="button"
                            onClick={handleTranscribe}
                            disabled={isTranscribing}
                            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {isTranscribing ? "Transcribing..." : "Use Audio"}
                        </button>

                        <button
                            type="button"
                            onClick={resetRecording}
                            className="p-2 text-gray-400 hover:text-red-500 transition"
                            title="Discard"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                )}
            </div>
            {isRecording && <p className="text-[10px] text-red-500 mt-2 font-mono animate-pulse">● Recording...</p>}
        </div>
    );
};

export default VoiceInput;
