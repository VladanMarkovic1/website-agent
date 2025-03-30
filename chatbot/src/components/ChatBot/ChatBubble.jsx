import ReactMarkdown from 'react-markdown'

function ChatBubble({ message }) {
  const { text, type } = message
  const isBot = type === 'bot'

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} group`}>
      <div
        className={`max-w-[80%] rounded-2xl px-6 py-3 ${
          isBot
            ? 'bg-white text-gray-800 shadow-md'
            : 'bg-blue-500 text-white shadow-md'
        } transform transition-all duration-200 hover:scale-[1.02]`}
      >
        <ReactMarkdown 
          className={`prose prose-sm max-w-none ${
            isBot 
              ? 'prose-gray' 
              : 'prose-invert'
          }`}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default ChatBubble 