import React from 'react';
import { FaRobot } from 'react-icons/fa';

const ChatButton = ({ onClick, text = 'Chat with us', primaryColor = '#4F46E5' }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-white text-sm border-0 focus:outline-none"
      style={{ backgroundColor: primaryColor }}
      aria-label={text}
    >
      <FaRobot className="text-lg" />
      <span className="font-medium">{text}</span>
    </button>
  );
};

export default ChatButton; 