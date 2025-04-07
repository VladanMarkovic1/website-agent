import { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { FaRobot } from 'react-icons/fa';

const ChatWidget = ({ 
  businessId = 'default',
  position = 'bottom-right',
  primaryColor = '#3B82F6',
  buttonText = 'Chat with us',
  buttonIcon = <FaRobot className="w-6 h-6" />
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!isMounted) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className={`bg-[${primaryColor}] hover:opacity-90 text-white rounded-full p-4 shadow-lg transition-all duration-200 ease-in-out flex items-center gap-2`}
          style={{ backgroundColor: primaryColor }}
        >
          {buttonIcon}
          <span className="hidden sm:inline">{buttonText}</span>
        </button>
      )}
      {isChatOpen && (
        <ChatWindow 
          onClose={() => setIsChatOpen(false)} 
          businessId={businessId}
        />
      )}
    </div>
  );
};

export default ChatWidget; 