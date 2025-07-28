import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';

// Simple ID generator function
const generateSimpleId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const ChatWidget = ({ 
    businessId, 
    backendUrl, // Renamed from backendApiUrl for consistency
    apiKey,     // Added apiKey prop
    initialPosition = 'bottom-right', 
    initialButtonText = 'Chat with us', 
    initialPrimaryColor = '#4F46E5' 
}) => {
    const [isOpen, setIsOpen] = useState(true);
    // Initialize messages state to an empty array
    const [messages, setMessages] = useState([]);
    const socketRef = useRef(null);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // State for dynamically loaded config
    const [widgetConfig, setWidgetConfig] = useState({
        primaryColor: initialPrimaryColor,
        position: initialPosition,
        welcomeMessage: 'Hello! How can I help you today?' // Default welcome message
    });
    const [configError, setConfigError] = useState(null);

    // State for language menu settings
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState(['en']);

    // State for dynamic options
    const [options, setOptions] = useState({ availableDays: [], availableTimes: [], services: [] });

    // Function to fetch dynamic config
    const fetchWidgetConfig = useCallback(async () => {
        if (!businessId || !backendUrl) return;
        try {
            console.log(`[ChatWidget] Fetching config from: ${backendUrl}/api/v1/chatbot/config/${businessId}`);
            const response = await fetch(`${backendUrl}/api/v1/chatbot/config/${businessId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch config: ${response.statusText}`);
            }
            const config = await response.json();
            console.log("[ChatWidget] Received dynamic config:", config);
            // Merge fetched config with initial props as fallbacks
            setWidgetConfig({
                primaryColor: config.widgetConfig?.primaryColor || initialPrimaryColor,
                position: config.widgetConfig?.position || initialPosition,
                welcomeMessage: config.widgetConfig?.welcomeMessage || 'Hello! How can I help you today?'
            });
            // Set language menu settings
            setShowLanguageMenu(config.showLanguageMenu || false);
            setSupportedLanguages(config.supportedLanguages || ['en']);
        } catch (error) {
            console.error('[ChatWidget] Error fetching widget config:', error);
            setConfigError('Could not load widget configuration.');
            // Use initial props as fallback for config
            setWidgetConfig({
                primaryColor: initialPrimaryColor,
                position: initialPosition,
                welcomeMessage: 'Hello! How can I help you today?'
            });
            // Use default language settings
            setShowLanguageMenu(false);
            setSupportedLanguages(['en']);
        }
    }, [businessId, backendUrl, initialPrimaryColor, initialPosition]);

    // Fetch public options (days, times, services) for the business
    const fetchOptions = useCallback(async () => {
        if (!businessId || !backendUrl) return;
        try {
            const response = await fetch(`${backendUrl}/api/v1/public/options/${businessId}`);
            if (!response.ok) throw new Error('Failed to fetch options');
            const data = await response.json();
            setOptions({
                availableDays: data.availableDays || [],
                availableTimes: data.availableTimes || [],
                services: data.services || []
            });
        } catch (error) {
            console.error('[ChatWidget] Error fetching options:', error);
            setOptions({ availableDays: [], availableTimes: [], services: [] });
        }
    }, [businessId, backendUrl]);

    // Initialize Session, Config, and Socket Connection
    useEffect(() => {
        // Generate or retrieve session ID
        let currentSessionId = localStorage.getItem(`chatbot_session_${businessId}`);
        if (!currentSessionId) {
            // Use simple ID generator
            currentSessionId = generateSimpleId(); 
            localStorage.setItem(`chatbot_session_${businessId}`, currentSessionId);
        }
        setSessionId(currentSessionId);

        // Fetch dynamic configuration
        fetchWidgetConfig();

        // Fetch public options
        fetchOptions();

        if (!businessId || !apiKey || !currentSessionId || !backendUrl) {
            console.error('[ChatWidget] Missing required info for WebSocket connection (businessId, apiKey, sessionId, backendUrl).');
            // Don't set configError here if fetchWidgetConfig handles it
            // setConfigError('Widget configuration incomplete.'); 
            return; // Prevent connection attempt if essential info missing before fetch
        }

        // Establish WebSocket connection only if all required info is present
        console.log(`[ChatWidget] Attempting WebSocket connection to ${backendUrl} for business ${businessId}`);
        socketRef.current = io(backendUrl, {
            query: {
                businessId,
                apiKey, // Send the API key in the query
                sessionId: currentSessionId
            },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 3 // Limit reconnection attempts
        });

        socketRef.current.on('connect', () => {
            console.log('[ChatWidget] Socket connected successfully with ID:', socketRef.current.id);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('[ChatWidget] Socket connection error:', err.message);
            // Display connection error to user?
            setConfigError(`Connection error: ${err.message}`); 
        });

        socketRef.current.on('message', (message) => {
            console.log('[ChatWidget] Received message from server:', message);
            setIsLoading(false); // Stop loading when response received
            // Use functional update to ensure latest state is used
            setMessages((prevMessages) => {
                // prevMessages is guaranteed to be the latest state here
                const newMessages = [...prevMessages, { id: generateSimpleId(), type: 'bot', content: message.response }];
                console.log('[ChatWidget] Updating messages state to:', newMessages);
                return newMessages;
            });
        });

        // Handle language change
        socketRef.current.on('languageChange', (data) => {
            console.log('[ChatWidget] Language changed to:', data.language);
            // Update the greeting message based on new language
            const greetings = {
                'en': "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
                'es': "👋 ¡Hola! Estoy aquí para ayudarte a conocer nuestros servicios dentales y encontrar el tratamiento perfecto para tus necesidades. ¿Cómo puedo ayudarte hoy?",
                'it': "👋 Ciao! Sono qui per aiutarti a conoscere i nostri servizi dentali e trovare il trattamento perfetto per le tue esigenze. Come posso aiutarti oggi?"
            };
            const newGreeting = greetings[data.language] || greetings['en'];
            
            // Replace the first message (greeting) with the new language
            setMessages((prevMessages) => {
                if (prevMessages.length > 0 && prevMessages[0].type === 'bot') {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[0] = { ...updatedMessages[0], content: newGreeting };
                    return updatedMessages;
                }
                return prevMessages;
            });
        });

        // Cleanup on component unmount
        return () => {
            if (socketRef.current) {
                console.log('[ChatWidget] Disconnecting socket...');
                socketRef.current.disconnect();
            }
            localStorage.removeItem(`chatbot_session_${businessId}`); // Clear session on unmount?
        };
    }, [businessId, apiKey, backendUrl, fetchWidgetConfig, fetchOptions]); // Removed 'messages' dependency

    const handleSendMessage = (text, language = 'en') => {
        if (!text.trim() || !socketRef.current || !socketRef.current.connected) return;

        // Use simple ID generator and consistent keys
        const userMessage = { id: generateSimpleId(), type: 'user', content: text }; 
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setIsLoading(true); // Start loading when user sends message

        console.log(`[ChatWidget] Sending message: "${text}" with language: ${language}`);
        socketRef.current.emit('message', { 
            message: text, 
            language: language,
            // businessId and sessionId are known server-side from the authenticated socket
        });
    };

    // Handle null state for messages during initial load
    // (Optional: Render loading state or nothing until messages are initialized)
    // if (messages === null) {
    //     return null; // Or a spinner
    // }

    // Determine widget positioning class
    const positionClass = widgetConfig.position === 'bottom-left' ? 'left-5' : 'right-5';

    return (
        <div className={`fixed bottom-5 ${positionClass} z-50`}>
            {configError && (
                 <div className="text-red-500 bg-white p-2 rounded shadow mb-2 text-xs">Error: {configError}</div>
             )}
            {isOpen ? (
                <ChatWindow 
                    messages={messages} 
                    setMessages={setMessages}
                    onSendMessage={handleSendMessage} 
                    onClose={() => setIsOpen(false)} 
                    primaryColor={widgetConfig.primaryColor}
                    welcomeMessage={widgetConfig.welcomeMessage}
                    isLoading={isLoading}
                    dayOptions={options.availableDays}
                    timeOptions={options.availableTimes}
                    concernOptions={options.services}
                    showLanguageMenu={showLanguageMenu}
                    supportedLanguages={supportedLanguages}
                />
            ) : (
                <ChatButton 
                    onClick={() => setIsOpen(true)} 
                    primaryColor={widgetConfig.primaryColor}
                    text={initialButtonText}
                />
            )}
        </div>
    );
};

export default ChatWidget; 