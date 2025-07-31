import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import './ChatWindow.css'; // Add this import at the top for custom styles

const getSubmissionMessage = (language = 'en') => {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  
  const messages = {
    'en': {
      weekend: 'We are closed for the weekend, but we will call you early on Monday with more information.',
      weekday: 'Our team will get back to you within 2 hours with more information.'
    },
    'es': {
      weekend: 'Estamos cerrados durante el fin de semana, pero te llamaremos temprano el lunes con más información.',
      weekday: 'Nuestro equipo se pondrá en contacto contigo en las próximas 2 horas con más información.'
    },
    'it': {
      weekend: 'Siamo chiusi durante il fine settimana, ma ti chiameremo presto lunedì con maggiori informazioni.',
      weekday: 'Il nostro team ti contatterà entro 2 ore con maggiori informazioni.'
    }
  };
  
  const langMessages = messages[language] || messages['en'];
  
  if (today === 0 || today === 6) {
    return langMessages.weekend;
  }
  return langMessages.weekday;
};

const ChatWindow = ({ 
  messages, 
  setMessages,
  onSendMessage, 
  onClose, 
  isLoading, 
  primaryColor = '#4F46E5', 
  dayOptions = [], 
  timeOptions = [], 
  concernOptions = [],
  showLanguageMenu = false,
  supportedLanguages = ['en']
}) => {
  // Add console log here
  console.log('[ChatWindow] Rendering with messages:', messages);

  const [input, setInput] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Chat Assistant');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const languageDropdownRef1 = useRef(null);
  const languageDropdownRef2 = useRef(null);

  // Language menu state
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

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
  let concerns = [];
  if (concernOptions && concernOptions.length > 0) {
    // Use a Set to track unique service names
    const uniqueNames = new Set();
    concerns = concernOptions
      .filter(s => {
        const name = typeof s === 'string' ? s : s.name;
        if (!name || typeof name !== 'string' || uniqueNames.has(name.toLowerCase())) {
          return false;
        }
        uniqueNames.add(name.toLowerCase());
        return true;
      })
      .map(s => (typeof s === 'string' ? { name: s } : s));
  } else {
    // Only use default concerns if no concerns are provided
    concerns = [
      { name: 'Pain' },
      { name: 'Broken teeth' },
      { name: 'Implants' },
      { name: 'Regular care' },
      { name: 'Whitening' },
      { name: 'Invisalign' }
    ];
  }
  
  // Always add 'Other' button at the end if not already present
  if (!concerns.some(c => c.name === 'Other')) {
    concerns.push({ name: 'Other' });
  }

  // Defensive log and filter
  console.log('Concerns for buttons:', concerns);
  concerns = concerns.filter(option => option && typeof option.name === 'string' && option.name.length > 0);

  // Day and time options
  const getDays = (language) => {
    const dayOptions = {
      'en': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      'es': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      'it': ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']
    };
    return dayOptions[language] || dayOptions['en'];
  };
  const getTimes = (language) => {
    const timeOptions = {
      'en': ['Morning', 'Afternoon'],
      'es': ['Mañana', 'Tarde'],
      'it': ['Mattina', 'Pomeriggio']
    };
    return timeOptions[language] || timeOptions['en'];
  };
  const days = getDays(selectedLanguage);
  const times = getTimes(selectedLanguage);
  const getInsuranceOptions = (language) => {
    const options = {
      'en': ['Yes', 'No'],
      'es': ['Sí', 'No'],
      'it': ['Sì', 'No']
    };
    return options[language] || options['en'];
  };
  const insuranceOptions = getInsuranceOptions(selectedLanguage);
  // Add timingOptions for appointment step
  const getTimingOptions = (language) => {
    const options = {
      'en': ['Now', '1-3 weeks', '1-3 months'],
      'es': ['Ahora', '1-3 semanas', '1-3 meses'],
      'it': ['Ora', '1-3 settimane', '1-3 mesi']
    };
    return options[language] || options['en'];
  };
  const timingOptions = getTimingOptions(selectedLanguage);

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

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef1.current && !languageDropdownRef1.current.contains(event.target)) {
        setIsLanguageOpen(false);
      }
      if (languageDropdownRef2.current && !languageDropdownRef2.current.contains(event.target)) {
        setIsLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
    
    // Update the greeting message based on new language
    const greetings = {
      'en': "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
      'es': "👋 ¡Hola! Estoy aquí para ayudarte a conocer nuestros servicios dentales y encontrar el tratamiento perfecto para tus necesidades. ¿Cómo puedo ayudarte hoy?",
      'it': "👋 Ciao! Sono qui per aiutarti a conoscere i nostri servizi dentali e trovare il trattamento perfetto per le tue esigenze. Come posso aiutarti oggi?"
    };
    const newGreeting = greetings[newLanguage] || greetings['en'];
    
    // Update the first message (greeting) with the new language
    if (messages.length > 0 && messages[0].type === 'bot') {
      const updatedMessages = [...messages];
      updatedMessages[0] = { ...updatedMessages[0], content: newGreeting };
      setMessages(updatedMessages);
    }
  };

  // Handlers
  const handleConcernClick = (option) => {
    setSelectedConcern(option);
    if (option === 'Other') {
      setFreeChat(true);
      setStep('chat');
    } else {
      // Send the concern selection to the backend immediately
      onSendMessage(`I'm interested in ${option}`);
      setStep(2);
    }
  };

  const handleTimingClick = (option) => {
    setAppointmentTimeframe(option);
    // Send the timing selection to the backend immediately
    onSendMessage(`I would like an appointment ${option.toLowerCase()}`);
    if (option === 'Now') {
      setStep(3);
    } else {
      setStep(4); // new step for best days
    }
  };

  const handleDaySelect = (day) => {
    setBestDays([day]);
    // Send the day selection to the backend immediately
    onSendMessage(`I prefer ${day} for my appointment`);
    setStep(5);
  };

  const handleTimeSelect = (time) => {
    setPreferredTime(time);
    // Send the time selection to the backend immediately
    onSendMessage(`I prefer ${time} appointments`);
    setStep(6); // insurance step
  };

  const handleInsuranceSelect = (val) => {
    setHasInsurance(val);
    // Send the insurance selection to the backend immediately
    onSendMessage(`I ${val === 'Yes' ? 'have' : 'do not have'} dental insurance`);
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
    
    onSendMessage(input, selectedLanguage);
    setInput('');
  };

  const handleSubmitDetails = async () => {
    // Only send contact info since extra details are already sent through button clicks
    let message = `${userDetails.name}, ${userDetails.phone}, ${userDetails.email}`;
    try {
      onSendMessage(message, selectedLanguage); // Use the same handler as classic chat
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
            <div className="flex items-center gap-2">
              {/* Language Menu */}
              {showLanguageMenu && supportedLanguages.length > 1 && (
                <div className="relative group" ref={languageDropdownRef1}>
                  <div className="relative">
                    <button
                      onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white border border-white/30 rounded-lg font-medium text-xs transition-all duration-300 hover:from-white/30 hover:to-white/20 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
                      style={{
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <span className="text-sm">
                        {selectedLanguage === 'en' ? '🇺🇸' : selectedLanguage === 'es' ? '🇪🇸' : selectedLanguage === 'it' ? '🇮🇹' : '🌐'}
                      </span>
                      <span className="font-semibold text-xs">
                        {selectedLanguage === 'en' ? 'English' : selectedLanguage === 'es' ? 'Español' : selectedLanguage === 'it' ? 'Italiano' : selectedLanguage}
                      </span>
                      <svg 
                        className={`w-3 h-3 transition-transform duration-300 ${isLanguageOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isLanguageOpen && (
                      <div className="absolute top-full mt-2 right-0 z-50 min-w-[160px]">
                        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden">
                          <div className="py-1">
                            {supportedLanguages.map((lang, index) => (
                              <button
                                key={lang}
                                onClick={() => {
                                  handleLanguageChange(lang);
                                  setIsLanguageOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                                  selectedLanguage === lang 
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                                    : 'text-gray-700 hover:text-gray-900'
                                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === supportedLanguages.length - 1 ? 'rounded-b-lg' : ''}`}
                              >
                                <span className="text-xl">
                                  {lang === 'en' ? '🇺🇸' : lang === 'es' ? '🇪🇸' : lang === 'it' ? '🇮🇹' : '🌐'}
                                </span>
                                <span className="font-medium">
                                  {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'it' ? 'Italiano' : lang}
                                </span>
                                {selectedLanguage === lang && (
                                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-white hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 ml-2 bg-transparent"
                aria-label="Close chat"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Step 1: Concern Selection */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center p-3 bg-gradient-to-b from-white to-gray-50">
              <div className="mb-3 text-center">
                <h3 className="text-lg font-semibold mb-1">
                  {selectedLanguage === 'en' ? 'How can we serve you?' : 
                   selectedLanguage === 'es' ? '¿Cómo podemos ayudarte?' : 
                   selectedLanguage === 'it' ? 'Come possiamo aiutarti?' : 'How can we serve you?'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedLanguage === 'en' ? 'Select your dental concern' : 
                   selectedLanguage === 'es' ? 'Selecciona tu problema dental' : 
                   selectedLanguage === 'it' ? 'Seleziona il tuo problema dentale' : 'Select your dental concern'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
                {concerns.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleConcernClick(option.name)}
                    className={`${option.name === 'Other' ? 'col-span-2' : ''} flex flex-col items-center py-3 text-base rounded-xl border border-gray-200 bg-[#D2A89E] hover:bg-[#c49a90] transition-all duration-200 font-semibold !text-white`}
                    style={{ color: '#fff' }}
                  >
                    {option.name === 'Other' ? 
                      (selectedLanguage === 'en' ? 'Other Concerns' : 
                       selectedLanguage === 'es' ? 'Otras Preocupaciones' : 
                       selectedLanguage === 'it' ? 'Altre Preoccupazioni' : 'Other Concerns') : 
                      option.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Step 2: Appointment Timing */}
          {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="mb-4 text-center font-semibold">
                📅 {selectedLanguage === 'en' ? 'How soon would you like an appointment?' : 
                    selectedLanguage === 'es' ? '¿Qué tan pronto te gustaría una cita?' : 
                    selectedLanguage === 'it' ? 'Quanto presto vorresti un appuntamento?' : 
                    'How soon would you like an appointment?'}
              </div>
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
                {selectedLanguage === 'en' ? 'Back' : 
                 selectedLanguage === 'es' ? 'Atrás' : 
                 selectedLanguage === 'it' ? 'Indietro' : 'Back'}
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
                    {getSubmissionMessage(selectedLanguage)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-center font-semibold">
                    {selectedLanguage === 'en' ? 'Please enter your details so we can book your appointment:' : 
                     selectedLanguage === 'es' ? 'Por favor ingresa tus datos para poder agendar tu cita:' : 
                     selectedLanguage === 'it' ? 'Inserisci i tuoi dati per prenotare il tuo appuntamento:' : 
                     'Please enter your details so we can book your appointment:'}
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={userDetails.name}
                    onChange={handleUserDetailChange}
                    placeholder={selectedLanguage === 'en' ? 'Your Name' : 
                               selectedLanguage === 'es' ? 'Tu Nombre' : 
                               selectedLanguage === 'it' ? 'Il Tuo Nome' : 'Your Name'}
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="name"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={userDetails.phone}
                    onChange={handleUserDetailChange}
                    placeholder={selectedLanguage === 'en' ? 'Phone Number' : 
                               selectedLanguage === 'es' ? 'Número de Teléfono' : 
                               selectedLanguage === 'it' ? 'Numero di Telefono' : 'Phone Number'}
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="tel"
                  />
                  <input
                    type="email"
                    name="email"
                    value={userDetails.email}
                    onChange={handleUserDetailChange}
                    placeholder={selectedLanguage === 'en' ? 'Email Address' : 
                               selectedLanguage === 'es' ? 'Dirección de Correo' : 
                               selectedLanguage === 'it' ? 'Indirizzo Email' : 'Email Address'}
                    className="mb-2 p-2 border rounded-lg w-full max-w-xs"
                    autoComplete="email"
                  />
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none mt-2 mb-2"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    {selectedLanguage === 'en' ? 'Back' : 
                     selectedLanguage === 'es' ? 'Atrás' : 
                     selectedLanguage === 'it' ? 'Indietro' : 'Back'}
                  </button>
                  <button
                    className="mt-4 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors duration-150"
                    style={{ backgroundColor: (userDetails.name && userDetails.phone && userDetails.email) ? primaryColor : '#ccc', border: 'none' }}
                    disabled={!(userDetails.name && userDetails.phone && userDetails.email)}
                    onClick={handleSubmitDetails}
                  >
                    {selectedLanguage === 'en' ? 'Submit' : 
                     selectedLanguage === 'es' ? 'Enviar' : 
                     selectedLanguage === 'it' ? 'Invia' : 'Submit'}
                  </button>
                  {submitStatus === 'error' && <div className="mt-2 text-red-600">
                    {selectedLanguage === 'en' ? 'There was an error submitting your request. Please try again.' : 
                     selectedLanguage === 'es' ? 'Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.' : 
                     selectedLanguage === 'it' ? 'Si è verificato un errore nell\'invio della richiesta. Riprova.' : 
                     'There was an error submitting your request. Please try again.'}
                  </div>}
                </>
              )}
            </div>
          )}
          {/* Step 4: Best Days */}
          {step === 4 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">
                {selectedLanguage === 'en' ? 'What days work the best?' : 
                 selectedLanguage === 'es' ? '¿Qué días te funcionan mejor?' : 
                 selectedLanguage === 'it' ? 'Quali giorni ti vanno meglio?' : 
                 'What days work the best?'}
              </div>
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
                  {selectedLanguage === 'en' ? 'Back' : 
                   selectedLanguage === 'es' ? 'Atrás' : 
                   selectedLanguage === 'it' ? 'Indietro' : 'Back'}
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center px-4 py-2 rounded-full text-white text-base font-medium transition-colors duration-150 shadow-none border-none focus:outline-none"
                  style={{ backgroundColor: bestDays.length === 1 ? primaryColor : '#ccc', cursor: bestDays.length === 1 ? 'pointer' : 'not-allowed' }}
                  disabled={bestDays.length !== 1}
                  onClick={() => setStep(5)}
                >
                  {selectedLanguage === 'en' ? 'Next' : 
                   selectedLanguage === 'es' ? 'Siguiente' : 
                   selectedLanguage === 'it' ? 'Avanti' : 'Next'}
                </button>
              </div>
            </div>
          )}
          {/* Step 5: Morning/Afternoon */}
          {step === 5 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">
                {selectedLanguage === 'en' ? 'Do you prefer morning or afternoon appointment?' : 
                 selectedLanguage === 'es' ? '¿Prefieres cita por la mañana o por la tarde?' : 
                 selectedLanguage === 'it' ? 'Preferisci appuntamento mattutino o pomeridiano?' : 
                 'Do you prefer morning or afternoon appointment?'}
              </div>
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
                  {selectedLanguage === 'en' ? 'Back' : 
                   selectedLanguage === 'es' ? 'Atrás' : 
                   selectedLanguage === 'it' ? 'Indietro' : 'Back'}
                </button>
              </div>
            </div>
          )}
          {/* Step 6: Dental Insurance */}
          {step === 6 && (
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="w-full pt-6 pb-7 text-center font-bold text-lg">
                {selectedLanguage === 'en' ? 'Do you have dental insurance?' : 
                 selectedLanguage === 'es' ? '¿Tienes seguro dental?' : 
                 selectedLanguage === 'it' ? 'Hai un\'assicurazione dentale?' : 
                 'Do you have dental insurance?'}
              </div>
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
                  {selectedLanguage === 'en' ? 'Back' : 
                   selectedLanguage === 'es' ? 'Atrás' : 
                   selectedLanguage === 'it' ? 'Indietro' : 'Back'}
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
                    placeholder={selectedLanguage === 'en' ? 'Click other to unlock chat...' : 
                         selectedLanguage === 'es' ? 'Haz clic en otro para desbloquear el chat...' : 
                         selectedLanguage === 'it' ? 'Clicca su altro per sbloccare la chat...' : 
                         'Click other to unlock chat...'}
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
        <div className="flex items-center gap-2">
          {/* Language Menu */}
          {showLanguageMenu && supportedLanguages.length > 1 && (
            <div className="relative group" ref={languageDropdownRef2}>
              <div className="relative">
                <button
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white border border-white/30 rounded-lg font-medium text-xs transition-all duration-300 hover:from-white/30 hover:to-white/20 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
                  style={{
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <span className="text-sm">
                    {selectedLanguage === 'en' ? '🇺🇸' : selectedLanguage === 'es' ? '🇪🇸' : selectedLanguage === 'it' ? '🇮🇹' : '🌐'}
                  </span>
                  <span className="font-semibold text-xs">
                    {selectedLanguage === 'en' ? 'English' : selectedLanguage === 'es' ? 'Español' : selectedLanguage === 'it' ? 'Italiano' : selectedLanguage}
                  </span>
                  <svg 
                    className={`w-3 h-3 transition-transform duration-300 ${isLanguageOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isLanguageOpen && (
                  <div className="absolute top-full mt-2 right-0 z-50 min-w-[160px]">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden">
                      <div className="py-1">
                        {supportedLanguages.map((lang, index) => (
                          <button
                            key={lang}
                            onClick={() => {
                              handleLanguageChange(lang);
                              setIsLanguageOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                              selectedLanguage === lang 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                                : 'text-gray-700 hover:text-gray-900'
                            } ${index === 0 ? 'rounded-t-lg' : ''} ${index === supportedLanguages.length - 1 ? 'rounded-b-lg' : ''}`}
                          >
                            <span className="text-xl">
                              {lang === 'en' ? '🇺🇸' : lang === 'es' ? '🇪🇸' : lang === 'it' ? '🇮🇹' : '🌐'}
                            </span>
                            <span className="font-medium">
                              {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : lang === 'it' ? 'Italiano' : lang}
                            </span>
                            {selectedLanguage === lang && (
                              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-white hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white/50 ml-2 bg-transparent"
            aria-label="Close chat"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
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
        {selectedLanguage === 'en' ? 'Back' : 
         selectedLanguage === 'es' ? 'Atrás' : 
         selectedLanguage === 'it' ? 'Indietro' : 'Back'}
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
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
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
              placeholder={selectedLanguage === 'en' ? 'Type your message...' : 
                         selectedLanguage === 'es' ? 'Escribe tu mensaje...' : 
                         selectedLanguage === 'it' ? 'Scrivi il tuo messaggio...' : 
                         'Type your message...'}
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