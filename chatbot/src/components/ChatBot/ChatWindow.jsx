import { useState, useRef, useEffect } from 'react'
import ChatHeader from './ChatHeader'
import ChatInput from './ChatInput'
import ChatBubble from './ChatBubble'
import { sendMessage } from '../../utils/api'

function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return

    const userMessage = {
      text: messageText,
      type: 'user',
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await sendMessage(messageText)
      const botMessage = {
        text: response.data.response,  // Updated to use the new response structure
        type: 'bot',
        messageType: response.data.type, // Store the message type from backend
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        type: 'bot',
        messageType: 'ERROR',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out">
      <ChatHeader onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Send a message to start the conversation</p>
          </div>
        )}
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg w-fit">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}

export default ChatWindow 