import { useState } from 'react';
import Navbar from './components/layout/Navbar';
import Hero from './components/sections/Hero';
import Services from './components/sections/Services';
import Testimonials from './components/sections/Testimonials';
import Contact from './components/sections/Contact';
import Footer from './components/layout/Footer';
import ChatWindow from './components/ui/ChatWindow';
import { FaRobot } from 'react-icons/fa';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      
      {/* Chatbot */}
      <div className="fixed bottom-4 right-4 z-50">
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
          >
            <FaRobot className="w-6 h-6" />
          </button>
        )}
        {isChatOpen && <ChatWindow onClose={() => setIsChatOpen(false)} />}
      </div>
    </div>
  );
}

export default App; 