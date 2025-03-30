import { useState } from 'react'
import ChatWindow from './components/ChatBot/ChatWindow'
import { FaRobot } from 'react-icons/fa'

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 ease-in-out"
        >
          <FaRobot className="w-6 h-6" />
        </button>
      )}
      {isChatOpen && <ChatWindow onClose={() => setIsChatOpen(false)} />}
    </div>
  )
}

export default App 