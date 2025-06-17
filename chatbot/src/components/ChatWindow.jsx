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

  // New state for button-based flow
  const [step, setStep] = useState(1); // 1: concern, 2: timing, 'chat': free chat
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [appointmentTimeframe, setAppointmentTimeframe] = useState(null);
  const [freeChat, setFreeChat] = useState(false);
  const [userDetails, setUserDetails] = useState({ name: '', phone: '', email: '' });
  const [bestDays, setBestDays] = useState([]); // array of selected days
  const [preferredTime, setPreferredTime] = useState('');
  const [hasInsurance, setHasInsurance] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'

  // Button options
  const concernOptions = [
    'Pain', 'Broken teeth', 'Implants', 'Regular care', 'Whitening', 'Invisalign', 'Other'
  ];
  const timingOptions = [
    'Now', '1-3 weeks', '1-3 months'
  ];

  // Day and time options
  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeOptions = ['7am-12pm', '1pm-4pm'];
  const insuranceOptions = ['Yes', 'No'];

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

  const handleDayToggle = (day) => {
    setBestDays((prev) => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
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
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => handleConcernClick('Pain')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">🦷</span>
                <span className="font-medium text-sm text-gray-800">Pain</span>
              </button>
              <button
                onClick={() => handleConcernClick('Broken teeth')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">🔧</span>
                <span className="font-medium text-sm text-gray-800">Broken teeth</span>
              </button>
              <button
                onClick={() => handleConcernClick('Implants')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">🦿</span>
                <span className="font-medium text-sm text-gray-800">Implants</span>
              </button>
              <button
                onClick={() => handleConcernClick('Regular care')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">✨</span>
                <span className="font-medium text-sm text-gray-800">Regular care</span>
              </button>
              <button
                onClick={() => handleConcernClick('Whitening')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">⭐</span>
                <span className="font-medium text-sm text-gray-800">Whitening</span>
              </button>
              <button
                onClick={() => handleConcernClick('Invisalign')}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">😊</span>
                <span className="font-medium text-sm text-gray-800">Invisalign</span>
              </button>
              <button
                onClick={() => handleConcernClick('Other')}
                className="col-span-2 flex flex-col items-center p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
              >
                <span className="text-xl mb-1">💬</span>
                <span className="font-medium text-sm text-gray-800">Other Concerns</span>
              </button>
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
              className="mt-2 text-blue-600 underline text-sm"
              onClick={handleBack}
            >
              Back
            </button>
          </div>
        )}
        {/* Step 3: Collect Name, Phone, Email */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
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
              className="mt-2 text-blue-600 underline text-sm"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              disabled={!(userDetails.name && userDetails.phone && userDetails.email)}
              onClick={handleSubmitDetails}
            >
              Submit
            </button>
            {submitStatus === 'success' && <div className="mt-2 text-green-600">Thank you! Your request has been submitted.</div>}
            {submitStatus === 'error' && <div className="mt-2 text-red-600">There was an error submitting your request. Please try again.</div>}
          </div>
        )}
        {/* Step 4: Best Days */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center font-semibold">What days work the best?</div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-4">
              {dayOptions.map((day) => (
                <button
                  key={day}
                  className={`py-2 px-3 rounded-lg border ${bestDays.includes(day) ? 'bg-blue-200 border-blue-400' : 'bg-gray-50 border-gray-300'} text-gray-800 font-medium focus:outline-none`}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </button>
              ))}
            </div>
            <button
              className="mt-2 text-blue-600 underline text-sm"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              disabled={bestDays.length === 0}
              onClick={() => setStep(5)}
            >
              Next
            </button>
          </div>
        )}
        {/* Step 5: Morning/Afternoon */}
        {step === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center font-semibold">Do you prefer morning or afternoon appointment?</div>
            <div className="flex flex-row gap-2 w-full max-w-xs mb-4">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  className={`py-2 px-3 rounded-lg border ${preferredTime === time ? 'bg-blue-200 border-blue-400' : 'bg-gray-50 border-gray-300'} text-gray-800 font-medium focus:outline-none`}
                  onClick={() => handleTimeSelect(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <button
              className="mt-2 text-blue-600 underline text-sm"
              onClick={handleBack}
            >
              Back
            </button>
          </div>
        )}
        {/* Step 6: Dental Insurance */}
        {step === 6 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center font-semibold">Do you have dental insurance?</div>
            <div className="flex flex-row gap-2 w-full max-w-xs mb-4">
              {insuranceOptions.map((val) => (
                <button
                  key={val}
                  className={`py-2 px-3 rounded-lg border ${hasInsurance === val ? 'bg-blue-200 border-blue-400' : 'bg-gray-50 border-gray-300'} text-gray-800 font-medium focus:outline-none`}
                  onClick={() => handleInsuranceSelect(val)}
                >
                  {val}
                </button>
              ))}
            </div>
            <button
              className="mt-2 text-blue-600 underline text-sm"
              onClick={handleBack}
            >
              Back
            </button>
          </div>
        )}
        {/* Bottom section with input and privacy policy */}
        <div className="w-full mt-auto">
          {(!selectedConcern || freeChat) && (
            <div className="px-4 py-2 border-t">
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Click other to unlock chat..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-gray-50"
                  ref={inputRef}
                  disabled={!freeChat}
                />
                <button
                  onClick={handleSubmit}
                  className="p-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: primaryColor }}
                  disabled={!input.trim() || !freeChat}
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center text-[11px] text-gray-500">
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-700"
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
        className="text-blue-600 underline text-sm mx-4 my-2 self-start"
        onClick={() => {
          setFreeChat(false);
          setStep(1);
          setSelectedConcern(null);
          setAppointmentTimeframe(null);
        }}
      >
        ← Back
      </button>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
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
        <form className="p-4 border-t" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-blue-500"
              ref={inputRef}
            />
            <button
              type="submit"
              className="p-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: primaryColor }}
              disabled={!input.trim()}
            >
              <FaPaperPlane />
            </button>
          </div>
        </form>
      )}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#888", marginTop: "4px" }}>
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#888", textDecoration: "none" }}
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