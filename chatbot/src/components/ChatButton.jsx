import React from 'react';

const ChatButton = ({ onClick, text = 'Chat with us', primaryColor = '#4F46E5' }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center p-0 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 focus:outline-none"
      style={{ 
        backgroundColor: primaryColor,
        animation: 'attractAttention 2s ease-in-out infinite'
      }}
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
      
      <style jsx>{`
        @keyframes attractAttention {
          0%, 100% { 
            transform: scale(1) translateX(0);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          10% { 
            transform: scale(1.05) translateX(-4px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }
          20% { 
            transform: scale(1.02) translateX(3px);
            box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
          }
          30% { 
            transform: scale(1.08) translateX(-6px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
          }
          40% { 
            transform: scale(1.03) translateX(5px);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
          }
          50% { 
            transform: scale(1.06) translateX(-3px);
            box-shadow: 0 7px 22px rgba(0, 0, 0, 0.22);
          }
          60% { 
            transform: scale(1.01) translateX(4px);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
          }
          70% { 
            transform: scale(1.04) translateX(-2px);
            box-shadow: 0 6px 19px rgba(0, 0, 0, 0.2);
          }
          80% { 
            transform: scale(1.02) translateX(3px);
            box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
          }
          90% { 
            transform: scale(1.05) translateX(-1px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }
        }
      `}</style>
    </button>
  );
};

export default ChatButton; 