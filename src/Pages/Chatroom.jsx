import { useState, useRef, useEffect } from 'react';
import { Send, Users, MessageCircle, Sparkles } from 'lucide-react';
import { BACKEND_URL } from '../utils/csrfManager';
import { io } from 'socket.io-client';

export default function CivixChatRoom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef();

  useEffect(() => {
    // Initialize Socket Connection
    // Initialize Socket Connection with Render-compatible options
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'], // Mandate websocket first, fallback to polling
      withCredentials: true,
      reconnectionAttempts: 5
    });

    // Listeners
    socketRef.current.on('receiveMessage', (message) => {
      // Check if this message comes from us
      const isMe = message.senderId === socketRef.current.id;
      setMessages((prev) => [...prev, { ...message, isCurrentUser: isMe, user: isMe ? 'You' : message.user }]);
    });

    socketRef.current.on('userCount', (count) => {
      setOnlineUsers(count);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageData = {
        id: Date.now(),
        // user: 'You', // In real app, this should come from Auth Context
        // For now, we rely on the server/client to identify 'You' by checking socket ID or similar, 
        // OR we just send 'You' and let the local client render it.
        // Better: Send a random user ID or name.
        user: `Citizen - ${Math.floor(Math.random() * 1000)} `,
        avatar: 'CZ',
        message: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: false // Server doesn't know "current user". We handle this on receive.
        // Actually, simpler: Client sends "senderId".
      };

      // Add senderId for local comparison
      messageData.senderId = socketRef.current.id;

      // Emit to server
      socketRef.current.emit('sendMessage', messageData);

      setNewMessage('');
      setIsTyping(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/40">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-green-100/50 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Civix Community
              </h1>
              <p className="text-sm text-gray-500">Community Services & Local Initiatives</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-100/70 backdrop-blur-sm px-4 py-2 rounded-full border border-green-200/50">
            <div className="relative">
              <Users className="w-4 h-4 text-green-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-sm font-semibold text-green-700">{onlineUsers}</span>
            <span className="text-xs text-green-600">online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items - start space - x - 3 group ${msg.isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''
              } `}
          >
            <div className={`relative w - 11 h - 11 rounded - 2xl flex items - center justify - center text - white text - sm font - bold shadow - lg ${msg.isCurrentUser
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : 'bg-gradient-to-br from-emerald-400 to-green-500'
              } group - hover: scale - 110 transition - transform duration - 200`}>
              {msg.avatar}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </div>

            <div className={`flex - 1 max - w - xs sm: max - w - md lg: max - w - lg ${msg.isCurrentUser ? 'text-right' : ''
              } `}>
              <div className={`relative rounded - 2xl p - 4 shadow - sm backdrop - blur - sm transition - all duration - 200 group - hover: shadow - md ${msg.isCurrentUser
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ml-auto'
                : 'bg-white/90 border border-green-100/50 text-gray-800'
                } `}>
                {!msg.isCurrentUser && (
                  <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                    {msg.user}
                    <Sparkles className="w-3 h-3 text-green-500" />
                  </p>
                )}
                <p className={`text - sm leading - relaxed ${msg.isCurrentUser ? 'text-white' : 'text-gray-700'
                  } `}>
                  {msg.message}
                </p>

                {/* Message tail */}
                <div className={`absolute top - 4 w - 3 h - 3 transform rotate - 45 ${msg.isCurrentUser
                  ? 'right-[-6px] bg-green-500'
                  : 'left-[-6px] bg-white border-l border-t border-green-100/50'
                  } `}></div>
              </div>

              <p className={`text - xs text - gray - 400 mt - 2 px - 1 ${msg.isCurrentUser ? 'text-right' : 'text-left'
                } `}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-green-100/50 p-4 sticky bottom-0">
        {isTyping && (
          <div className="mb-3 flex items-center space-x-2 text-sm text-green-600">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>You're typing...</span>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(e);
                }
              }}
              placeholder="Share your community initiative or ask for help..."
              className="w-full p-4 pr-12 bg-white/70 backdrop-blur-sm border-2 border-green-200/50 rounded-2xl focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300 placeholder-gray-400 text-gray-700 shadow-sm hover:shadow-md focus:shadow-lg"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {newMessage.trim() && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-sm transform hover:scale-105 active:scale-95 disabled:scale-100"
          >
            <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3 text-green-500" />
          Connect with your community • Share resources • Make a difference together
        </p>
      </div>
    </div>
  );
}