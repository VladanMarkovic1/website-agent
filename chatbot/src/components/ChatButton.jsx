import React from 'react';

const ChatButton = ({ onClick, text = 'Chat with us', primaryColor = '#4F46E5' }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center p-0 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 focus:outline-none"
      style={{ backgroundColor: primaryColor }}
      aria-label={text}
    >
      {/* Intercom-style chat bubble icon */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <g>
          <path
            d="M12 10c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7.5l3.5 3.5c.4.4 1 .1 1-.4V26h2c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2H12z"
            fill="white"
          />
          <path
            d="M16 19c1.333 1.333 6.667 1.333 8 0"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </button>
  );
};

export default ChatButton; 