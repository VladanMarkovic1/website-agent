import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const ChatWindow = ({ messages, onSendMessage, onClose, isLoading, primaryColor = '#4F46E5' }) => {
  // Add console log here
  console.log('[ChatWindow] Rendering with messages:', messages);

  const [input, setInput] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Chat Assistant');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Update header title based on service mentions in messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'assistant' && lastMessage.serviceContext) {
        setHeaderTitle(`💬 ${lastMessage.serviceContext}`);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat window opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-2xl shadow-xl border border-gray-200">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-3 rounded-t-2xl text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <h2 className="text-base font-semibold truncate">{headerTitle}</h2>
        <button
          onClick={onClose}
          className="text-white hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 ml-2 bg-transparent"
          aria-label="Close chat"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-white">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl text-base leading-relaxed shadow-sm ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="m-0">{children}</p>
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-5 py-4 border-t bg-white">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-base"
          />
          <button
            type="submit"
            className="p-3 text-white rounded-xl transition-colors flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
            disabled={!input.trim()}
          >
            <FaPaperPlane className="w-5 h-5" />
          </button>
        </div>
      </form>

      <div className="text-center text-xs text-gray-400 pb-2 pt-1 select-none">
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            window.open("/privacy.html", "_blank");
          }}
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
};

export default ChatWindow; 