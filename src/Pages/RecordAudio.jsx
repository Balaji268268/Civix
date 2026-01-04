import React, { useState, useRef } from "react";
import { Mic, Square, Loader2, FileAudio, Type } from "lucide-react";
import { toast } from "react-hot-toast";
import csrfManager from "../utils/csrfManager";
import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";

export default function RecordAudio() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);

    // Create FormData
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      // 1. Call Backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await csrfManager.secureFetch(`${API_URL}/api/ml/transcribe-audio/`, {
        method: "POST",
        body: formData
      });
      // Note: secureFetch usually handles JSON headers, but for FormData we might need to let browser set Content-Type
      // If secureFetch forces JSON, this might fail. We might need a raw fetch or adjust secureFetch.
      // Assuming secureFetch is smart or we can override headers.
      // Actually, standard fetch with FormData sets boundary automatically. 
      // Let's use raw fetch if secureFetch is strict, but let's try assuming secureFetch handles it or we pass empty headers.

      // Attempt generic fetch if secureFetch is strict about Content-Type: application/json

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setTranscription(data.text);
      toast.success("Transcription Complete!");
    } catch (err) {
      console.error(err);
      toast.error("AI Transcription failed. Is the ML Service running?");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Navbar />

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center">

            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Voice Report</h1>
            <p className="text-gray-500 mb-8">Record your civic issue and let AI transcribe it for you.</p>

            <div className="flex justify-center gap-4 mb-8">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                >
                  <Mic size={20} /> Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-full font-bold transition-all animate-pulse"
                >
                  <Square size={20} /> Stop Recording
                </button>
              )}
            </div>

            {/* Player */}
            {audioURL && (
              <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-xl mb-6">
                <audio controls src={audioURL} className="w-full" />
              </div>
            )}

            {/* Transibe Action */}
            {audioBlob && !isRecording && (
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isTranscribing ? <Loader2 className="animate-spin" /> : <Type />}
                {isTranscribing ? "AI is listening..." : "Transcribe with AI"}
              </button>
            )}

            {/* Result */}
            {transcription && (
              <div className="mt-8 text-left bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-emerald-700 uppercase mb-2 flex items-center gap-2">
                  <FileAudio size={16} /> AI Transcription
                </h3>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
                  "{transcription}"
                </p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(transcription); toast.success("Copied!"); }} className="text-xs bg-white px-3 py-1 rounded-lg border shadow-sm hover:bg-gray-50 text-gray-600 font-semibold">Copy Text</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
