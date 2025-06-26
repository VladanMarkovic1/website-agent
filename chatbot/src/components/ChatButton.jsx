import React from 'react';

const ChatButton = ({ onClick, text = 'Chat with us', primaryColor = '#4F46E5' }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center p-0 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 focus:outline-none"
      style={{ backgroundColor: primaryColor }}
      aria-label={text}
    >
      {/* Custom SVG icon for chat bubble with smile */}
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="24" fill="white"/>
        <rect x="12" y="12" width="24" height="20" rx="6" fill="white"/>
        <path d="M18 26c1.5 2 6.5 2 8 0" stroke="#2196F3" strokeWidth="2" strokeLinecap="round"/>
        <rect x="12" y="12" width="24" height="20" rx="6" stroke="#2196F3" strokeWidth="2"/>
      </svg>
    </button>
  );
};

export default ChatButton; 