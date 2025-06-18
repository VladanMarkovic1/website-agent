import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const getSubmissionMessage = () => {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  if (today === 0 || today === 6) {
    return 'We are closed for the weekend, but we will call you early on Monday with more information.';
  }
  return 'Our team will get back to you within 2 hours with more information.';
};

const ChatWindow = ({ messages, onSendMessage, onClose, isLoading, primaryColor = '#4F46E5', dayOptions = [], timeOptions = [], concernOptions = [] }) => {
  // Add console log here
  console.log('[ChatWindow] Rendering with messages:', messages);

  const [input, setInput] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Chat Assistant');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // New state for button-based flow
  //new state for button-based flow
  
  const [step, setStep] = useState(1); // 1: concern, 2: timing, 'chat': free chat
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [appointmentTimeframe, setAppointmentTimeframe] = useState(null);
  const [freeChat, setFreeChat] = useState(false);
  const [userDetails, setUserDetails] = useState({ name: '', phone: '', email: '' });
  const [bestDays, setBestDays] = useState([]); // array of selected days
  const [preferredTime, setPreferredTime] = useState('');
  const [hasInsurance, setHasInsurance] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'

  // Concern options (services)
  let concerns = (concernOptions && concernOptions.length > 0)
    ? concernOptions.map(s => (typeof s === 'string' ? { name: s } : s))
    : [
        { name: 'Pain' },
        { name: 'Broken teeth' },
        { name: 'Implants' },
        { name: 'Regular care' },
        { name: 'Whitening' },
        { name: 'Invisalign' }
      ];
  // Always add 'Other' button at the end, but only once
  if (!concerns.some(c => c.name === 'Other')) {
    concerns.push({ name: 'Other' });
  }
  // Defensive log and filter
  console.log('Concerns for buttons:', concerns);
  concerns = concerns.filter(option => option && typeof option.name === 'string' && option.name.length > 0);

  // Day and time options
  const days = dayOptions.length > 0 ? dayOptions : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  // Remove timeOptions from backend, use static options for time selection
  const times = ['Morning', 'Afternoon'];
  const insuranceOptions = ['Yes', 'No'];
  // Add timingOptions for appointment step
  const timingOptions = ['Now', 'This week', 'Next week'];

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

  // Handlers
  const handleConcernClick = (option) => {
    setSelectedConcern(option);
    if (option === 'Other') {
      setFreeChat(true);
      setStep('chat');
    } else {
      setStep(2);
    }
  };

  const handleTimingClick = (option) => {
    setAppointmentTimeframe(option);
    if (option === 'Now') {
      setStep(3);
    } else {
      setStep(4); // new step for best days
    }
  };

  const handleDaySelect = (day) => {
    setBestDays([day]);
  };

  const handleTimeSelect = (time) => {
    setPreferredTime(time);
    setStep(6); // insurance step
  };

  const handleInsuranceSelect = (val) => {
    setHasInsurance(val);
    setStep(3); // go to name/phone/email form
  };

  const handleUserDetailChange = (e) => {
    setUserDetails({ ...userDetails, [e.target.name]: e.target.value });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedConcern(null);
      setFreeChat(false); // Reset freeChat when going back to first step
      setAppointmentTimeframe(null);
    } else if (step === 3) {
      if (appointmentTimeframe === 'Now') {
        setStep(2);
      } else {
        setStep(6); // insurance step
      }
    } else if (step === 4) {
      setStep(2);
      setBestDays([]);
    } else if (step === 5) {
      setStep(4);
      setPreferredTime('');
    } else if (step === 6) {
      setStep(5);
      setHasInsurance('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    onSendMessage(input);
    setInput('');
  };

  const handleSubmitDetails = async () => {
    // Compose message string as in the old way, but only use the user's name
    let message = `${userDetails.name}, ${userDetails.phone}, ${userDetails.email}`;
    // Add extra details for context
    const extras = [];
    if (selectedConcern) extras.push(`Concern: ${selectedConcern}`);
    if (appointmentTimeframe) extras.push(`Timing: ${appointmentTimeframe}`);
    if (bestDays.length) extras.push(`Days: ${bestDays.join(', ')}`);
    if (preferredTime) extras.push(`Time: ${preferredTime}`);
    if (hasInsurance) extras.push(`Insurance: ${hasInsurance}`);
    if (extras.length) message += '. ' + extras.join('. ');
    try {
      onSendMessage(message); // Use the same handler as classic chat
      setSubmitStatus('success');
    } catch (e) {
      setSubmitStatus('error');
    }
  };

  // Render logic for new flow
  try {
    if (!freeChat) {
      return (
        <div className="flex flex-col w-80 h-[500px] bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 rounded-t-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <h2 className="text-base font-semibold truncate">Chat Assistant</h2>
            <button
              onClick={onClose}
              className="text-white hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 ml-2 bg-transparent"
              aria-label="Close chat"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
          {/* Step 1: Concern Selection */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center p-3 bg-gradient-to-b from-white to-gray-50">
              <div className="mb-3 text-center">
                <h3 className="text-lg font-semibold mb-1">How can we serve you?</h3>
                <p className="text-sm text-gray-600">Select your dental concern</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
                {concerns.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleConcernClick(option.name)}
                    className={`${option.name === 'Other' ? 'col-span-2' : ''} flex flex-col items-center py-3 text-base rounded-xl border border-gray-200 bg-[#D2A89E] hover:bg-[#c49a90] transition-all duration-200 font-semibold !text-white`}
                    style={{ color: '#fff' }}
                  >
                    {option.name === 'Other' ? 'Other Concerns' : option.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Step 2: Appointment Timing */}
          {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="mb-4 text-center font-semibold">📅 How soon would you like an appointment?</div>
              <div className="flex flex-col gap-2 w-full max-w-xs mb-4">
                {timingOptions.map((option) => (
                  <button
                    key={option}
                    className="py-2 px-3 rounded-lg border border-gray-300 bg-gray-50 hover:bg-blue-100 text-gray-800 font-medium focus:outline-none"
                    onClick={() => handleTimingClick(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors duration-150 shadow-none border-none focus:outline-none w-fit mt-2 mb-2"
              >
                <FaArrowLeft className="w-3 h-3" />
                Back
              </button>
            </div>
          )}
          {/* Step 3: Collect Name, Phone, Email */}
          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {submitStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center w-full">
                  <FaCheckCircle className="text-green-500 mb-3" style={{ fontSize: 56 }} />
                  <div className="text-green-700 text-base font-semibold text-center mb-2">
                    {getSubmissionMessage()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-center font-semibold">Please enter your details so we can book your appointment:</div>
                  <input
                    type="text"
                    name="name"
                    value={userDetails.name}
                    onChange={handleUserDetailChange}
                    placeholder="Your Name"
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="name"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={userDetails.phone}
                    onChange={handleUserDetailChange}
                    placeholder="Phone Number"
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="tel"
                  />
                  <input
                    type="email"
                    name="email"
                    value={userDetails.email}
                    onChange={handleUserDetailChange}
                    placeholder="Email Address"
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="email"
                  />
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none mt-2 mb-2"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    className="mt-4 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors duration-150"
                    style={{ backgroundColor: (userDetails.name && userDetails.phone && userDetails.email) ? primaryColor : '#ccc', border: 'none' }}
                    disabled={!(userDetails.name && userDetails.phone && userDetails.email)}
                    onClick={handleSubmitDetails}
                  >
                    Submit
                  </button>
                  {submitStatus === 'error' && <div className="mt-2 text-red-600">There was an error submitting your request. Please try again.</div>}
                </>
              )}
            </div>
          )}
          {/* Step 4: Best Days */}
          {step === 4 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">What days work the best?</div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-8">
                {days.map((day) => (
                  <button
                    key={day}
                    className={`py-3 rounded-xl font-medium text-base transition-all duration-150 shadow-sm focus:outline-none
                      ${bestDays.includes(day)
                        ? 'text-white scale-105'
                        : 'text-gray-700'} bg-gray-100 hover:bg-gray-200`}
                    style={bestDays.includes(day) ? { backgroundColor: primaryColor, color: '#fff', border: 'none' } : { border: 'none' }}
                    onClick={() => handleDaySelect(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex flex-row justify-between w-full max-w-xs mt-2 gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center px-4 py-2 rounded-full text-white text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none"
                  style={{ backgroundColor: bestDays.length === 1 ? primaryColor : '#ccc', cursor: bestDays.length === 1 ? 'pointer' : 'not-allowed' }}
                  disabled={bestDays.length !== 1}
                  onClick={() => setStep(5)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Step 5: Morning/Afternoon */}
          {step === 5 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">Do you prefer morning or afternoon appointment?</div>
              <div className="flex flex-row justify-center gap-4 w-full max-w-xs mb-8">
                {times.map((time) => (
                  <button
                    key={time}
                    className={`flex-1 py-3 rounded-xl font-medium text-base transition-all duration-150 shadow-sm focus:outline-none
                      ${preferredTime === time
                        ? 'text-white scale-105'
                        : 'text-gray-700'} bg-gray-100 hover:bg-gray-200`}
                    style={preferredTime === time ? { backgroundColor: primaryColor, color: '#fff', border: 'none' } : { border: 'none' }}
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <div className="flex justify-center w-full max-w-xs mt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>
          )}
          {/* Step 6: Dental Insurance */}
          {step === 6 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">Do you have dental insurance?</div>
              <div className="flex flex-row justify-center gap-4 w-full max-w-xs mb-8">
                {insuranceOptions.map((val) => (
                  <button
                    key={val}
                    className={`flex-1 py-3 rounded-xl font-medium text-base transition-all duration-150 shadow-sm focus:outline-none
                      ${hasInsurance === val
                        ? 'text-white scale-105'
                        : 'text-gray-700'} bg-gray-100 hover:bg-gray-200`}
                    style={hasInsurance === val ? { backgroundColor: primaryColor, color: '#fff', border: 'none' } : { border: 'none' }}
                    onClick={() => handleInsuranceSelect(val)}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-center w-full max-w-xs mt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>
          )}
          {/* Bottom section with input and privacy policy */}
          <div className="w-full">
            {(!selectedConcern || freeChat) && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Click other to unlock chat..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white shadow-sm border-0 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    ref={inputRef}
                    disabled={!freeChat}
                  />
                  <button
                    onClick={handleSubmit}
                    className="p-2.5 text-white rounded-lg transition-colors focus:outline-none border-0 shadow-none"
                    style={{ backgroundColor: primaryColor }}
                    disabled={!input.trim() || !freeChat}
                  >
                    <FaPaperPlane className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center pt-1 pb-2">
                  <a
                    href="/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-black font-medium underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open("/privacy.html", "_blank");
                    }}
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  } catch (err) {
    console.error('ChatWindow render error:', err);
    return <div className="p-4 text-red-600">Chatbot error: {err.message}</div>;
  }

  // ... existing code for free chat ...
  // (Keep your original chat window rendering here for free chat mode)

  return (
    <div className="flex flex-col w-80 h-[500px] bg-white rounded-lg shadow-xl">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 rounded-t-lg text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <h2 className="text-base font-semibold truncate">{headerTitle}</h2>
        <button
          onClick={onClose}
          className="text-white hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 ml-2 bg-transparent"
          aria-label="Close chat"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
      {/* Back button for free chat mode */}
      <button
        type="button"
        onClick={() => {
          setFreeChat(false);
          setStep(1);
          setSelectedConcern(null);
          setAppointmentTimeframe(null);
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors duration-150 shadow-none border-none focus:outline-none w-fit mt-2 mb-2"
      >
        <FaArrowLeft className="w-3 h-3" />
        Back
      </button>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => {
          const isUser = message.role === "user" || message.type === "user";
          return (
            <div
              key={index}
              className={`mb-4 w-full flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`inline-block p-3 rounded-lg max-w-[80%] break-words ${
                  isUser ? "text-white" : "bg-gray-100 text-gray-800"
                }`}
                style={isUser ? { backgroundColor: primaryColor } : {}}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-800">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input form - Show initially and when Other is selected, hide when specific concern is selected */}
      {(!selectedConcern || freeChat) && (
        <form className="p-2 border-t" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 rounded-lg focus:outline-none focus:border-blue-500 border-0"
              ref={inputRef}
            />
            <button
              type="submit"
              className="p-2 text-white rounded-lg transition-colors border-0 shadow-none focus:outline-none"
              style={{ backgroundColor: primaryColor }}
              disabled={!input.trim()}
            >
              <FaPaperPlane />
            </button>
          </div>
        </form>
      )}
      <div className="w-full text-center pt-0 pb-1">
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-black font-medium underline-offset-2 hover:underline"
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