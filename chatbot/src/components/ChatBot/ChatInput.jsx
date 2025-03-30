import { useState } from 'react'
import { FaPaperPlane } from 'react-icons/fa'

function ChatInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-center space-x-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`p-3 rounded-xl transition-all duration-200 ${
            message.trim() && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FaPaperPlane className={`text-lg ${message.trim() && !isLoading ? 'transform -rotate-12' : ''}`} />
        </button>
      </form>
    </div>
  )
}

export default ChatInput 