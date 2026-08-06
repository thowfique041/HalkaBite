import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleChat } from '../../store/slices/uiSlice';
import type { RootState } from '../../store/store';
import axios from 'axios';
import {
  AIRecommendedComboCard,
  AIRecommendedFoodCard,
  type AIRecommendedCombo,
  type AIRecommendedFood,
} from './AIRecommendationCards';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  recommendedFoods?: AIRecommendedFood[];
  recommendedCombos?: AIRecommendedCombo[];
}

const ChatWidget: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isChatOpen } = useAppSelector((state: RootState) => state.ui);
  const token = useAppSelector((state: RootState) => state.auth.token);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! 👋 I'm HalkaBite AI Assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/chat`,
        { message: input },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.data.message,
        isBot: true,
        timestamp: new Date(),
        recommendedFoods: response.data.data.recommendedFoods || [],
        recommendedCombos: response.data.data.recommendedCombos || [],
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please try again later.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isChatOpen) {
    return (
      <button
        onClick={() => dispatch(toggleChat())}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg shadow-secondary-500/30 flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[600px] lg:w-[760px] h-[min(680px,calc(100vh-1.5rem))] card flex flex-col z-50 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-secondary-600/20 to-primary-600/20 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-secondary-500 to-primary-500 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">HalkaBite AI</h3>
            <p className="text-xs text-green-400">Online</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(toggleChat())}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isBot ? '' : 'flex-row-reverse'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isBot
                  ? 'bg-gradient-to-r from-secondary-500 to-primary-500'
                  : 'bg-white/20'
              }`}
            >
              {message.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div
              className={`${message.recommendedFoods?.length || message.recommendedCombos?.length ? 'max-w-[calc(100%-2.75rem)] w-full' : 'max-w-[75%]'} p-3 rounded-2xl ${
                message.isBot
                  ? 'bg-white/10 rounded-tl-sm'
                  : 'bg-primary-500/20 rounded-tr-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
              {!!message.recommendedFoods?.length && (
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 mt-4 scrollbar-thin" aria-label="Recommended foods">
                  {message.recommendedFoods.map(food => <AIRecommendedFoodCard key={food.foodId} food={food} />)}
                </div>
              )}
              {!!message.recommendedCombos?.length && (
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 mt-4 scrollbar-thin" aria-label="Recommended meal combos">
                  {message.recommendedCombos.map(combo => <AIRecommendedComboCard key={combo.comboId} combo={combo} />)}
                </div>
              )}
              <p className="text-[10px] text-white/40 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary-500 to-primary-500 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="input flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
