import { useState, useRef, useEffect } from 'react'
import { FaRobot, FaTimes } from 'react-icons/fa'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Generate a random session ID if not exists
const getSessionId = () => {
  let sessionId = localStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2);
    localStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
}

const ChatBubble = ({ message }) => (
  <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[80%] rounded-lg px-4 py-2 ${
        message.type === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
      }`}
    >
      {message.text}
    </div>
  </div>
);

const ChatHeader = ({ onClose }) => (
  <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
    <div>
      <h3 className="text-lg font-semibold">Chat with Us</h3>
      <p className="text-sm opacity-90">How can we help you today?</p>
    </div>
    <button
      onClick={onClose}
      className="text-white hover:text-gray-200 transition-colors"
    >
      <FaTimes className="w-5 h-5" />
    </button>
  </div>
);

const ChatInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
};

function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      text: messageText,
      type: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const sessionId = getSessionId();
      const response = await api.post('/chatbot/message', {
        message: messageText,
        sessionId: sessionId
      });

      const botMessage = {
        text: response.data.response || response.data.message,
        type: 'bot',
        messageType: response.data.type,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        type: 'bot',
        messageType: 'ERROR',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out">
      <ChatHeader onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Send a message to start the conversation</p>
          </div>
        )}
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg w-fit">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

export default ChatWindow; 