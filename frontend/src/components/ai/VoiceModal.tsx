import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleVoiceModal } from '../../store/slices/uiSlice';
import type { RootState } from '../../store/store';
import axios from 'axios';
import toast from 'react-hot-toast';

const VoiceModal: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isVoiceModalOpen } = useAppSelector((state: RootState) => state.ui);
  const { token } = useAppSelector((state: RootState) => state.auth);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isVoiceModalOpen) {
      setTranscript('');
      setResponse('');
      setIsListening(false);
    }
  }, [isVoiceModalOpen]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResponse('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.error('Failed to recognize speech. Please try again.');
    };

    recognition.start();
  };

  const processVoiceCommand = async (text: string) => {
    if (!token) {
      toast.error('Please login to use voice ordering');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/voice`,
        { transcript: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiData = res.data.data;
      setResponse(aiData.message);

      // Speak the response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiData.message);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      }

      // Handle navigation action
      if (aiData.action && aiData.action.type === 'NAVIGATE' && aiData.action.payload) {
        setTimeout(() => {
          navigate(aiData.action.payload);
          dispatch(toggleVoiceModal());
        }, 1500); // Wait for speech to start/finish a bit
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVoiceModalOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={() => dispatch(toggleVoiceModal())}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="card w-full max-w-md p-8 text-center animate-scale-up">
          {/* Close Button */}
          <button
            onClick={() => dispatch(toggleVoiceModal())}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <h2 className="text-2xl font-bold mb-2">Voice Ordering</h2>
          <p className="text-white/60 mb-8">Speak to order your favorite food</p>

          {/* Microphone Button */}
          <div className="relative mb-8">
            <button
              onClick={startListening}
              disabled={isListening || isProcessing}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                ? 'bg-red-500 animate-pulse glow-lg'
                : isProcessing
                  ? 'bg-primary-500/50'
                  : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:scale-110 glow'
                }`}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </button>

            {/* Ripple Effect when listening */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
                <div className="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping" style={{ animationDelay: '0.5s' }} />
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-lg mb-4">
            {isListening
              ? 'Listening...'
              : isProcessing
                ? 'Processing...'
                : 'Tap to speak'}
          </p>

          {/* Transcript */}
          {transcript && (
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-sm text-white/40 mb-1">You said:</p>
              <p className="text-lg">{transcript}</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
              <p className="text-sm text-primary-400 mb-1">AI Response:</p>
              <p className="text-lg">{response}</p>
            </div>
          )}

          {/* Examples */}
          {!transcript && !response && (
            <div className="mt-8 text-left">
              <p className="text-sm text-white/40 mb-2">Try saying:</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>"I want to order a burger"</li>
                <li>"What's the status of my order?"</li>
                <li>"Recommend me something"</li>
                <li>"Show me the menu"</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VoiceModal;
