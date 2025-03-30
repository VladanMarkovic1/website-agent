import { FaRobot, FaTimes } from 'react-icons/fa'

function ChatHeader({ onClose }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <div className="bg-white p-2 rounded-lg">
          <FaRobot className="text-blue-500 text-xl" />
        </div>
        <h2 className="text-white font-semibold text-lg">AI Assistant</h2>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:bg-blue-600 p-2 rounded-full transition-colors duration-200"
      >
        <FaTimes className="text-xl" />
      </button>
    </div>
  )
}

export default ChatHeader 