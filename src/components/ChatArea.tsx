import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Phone, Video, X, Share2, Volume2, VolumeX } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Message, Attachment } from '../types';
import { sendChatMessage } from '../services/gemini';
import { CAR_DATABASE } from '../data/cars';
import { cn } from '../lib/utils';

import { logService } from '../services/logService';

interface ChatAreaProps {
  onClose?: () => void;
}

export function ChatArea({ onClose }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greeting',
      text: "Hello! 👋 This is Abena.\n\nI have some of the cleanest and most reliable vehicles currently available in the Ghanaian market, ranging from fuel-efficient daily drivers to high-end luxury models.\n\nMy goal is to help you find a car that offers both prestige and peace of mind.\n\nTo recommend the perfect match from our inventory, could you share a few details?\n\n1️⃣ **Budget**: What is your estimated price range in Ghana Cedis (₵)?\n\n2️⃣ **Vehicle Type**: Are you looking for a fuel-efficient sedan, rugged SUV, or luxury model?\n\n3️⃣ **Purpose**: Will the car be for personal use, family, or business (like Uber/Bolt)?\n\n4️⃣ **Timeline**: How soon are you planning to get behind the wheel?\n\nReply with your answers, and I’ll pull up the best options for you right away! 🚗💨",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isCalling, setIsCalling] = useState(false);

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat?")) {
      setMessages([]);
    }
  };

  const startCall = () => {
    setIsCalling(true);
    setTimeout(() => {
      setIsCalling(false);
      alert("Call ended. Abena is currently only available for chat.");
    }, 3000);
  };

  const [autoRead, setAutoRead] = useState(false);

  const toggleAutoRead = () => {
    setAutoRead(!autoRead);
    if (!autoRead) {
      alert("Auto-read enabled. Abena will now read out her messages automatically.");
    } else {
      window.speechSynthesis.cancel();
    }
  };

  const handleConfirmBooking = (carId: string, carName: string) => {
    const booking = logService.addBooking({
      car_id: carId,
      customer_email: 'nyaabaaugustine@gmail.com', // Using the user's email from context
      status: 'confirmed'
    });

    const confirmationMessage: Message = {
      id: Date.now().toString(),
      text: `✅ **Booking Confirmed!**\n\nYour viewing for the **${carName}** has been scheduled. Our sales manager will contact you shortly at +233504512884 to finalize the details.\n\n**Booking ID**: ${booking.id}`,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, confirmationMessage]);
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Booking confirmed for your ${carName}. We will contact you shortly.`);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    if (!text.trim() && !attachment) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      attachment
    };

    const currentMessages = [...messages];
    setMessages((prev) => [...prev, userMessage]);
    
    // Log user message
    logService.addMessageToSession(userMessage);
    
    setIsLoading(true);

    try {
      let responseText = await sendChatMessage(currentMessages, text, attachment);
      const aiImages: string[] = [];
      let bookingProposal: { carId: string; carName: string } | undefined;

      const processJsonAction = (data: any, originalText: string) => {
        if (data.action === 'send_car_images' || data.action === 'send_car_image' || data.recommended_car_id) {
          const carId = data.car_id || data.recommended_car_id;
          if (carId) {
            const car = CAR_DATABASE.find(c => c.id === String(carId));
            if (car && !aiImages.includes(car.image_url)) {
              aiImages.push(car.image_url);
            }
          }
        }

        if (data.action === 'propose_booking' && data.car_id) {
          const car = CAR_DATABASE.find(c => c.id === String(data.car_id));
          if (car) {
            bookingProposal = {
              carId: car.id,
              carName: `${car.brand} ${car.model}`
            };
          }
        }
        
        if (data.intent || data.lead_temperature) {
          logService.addLog({
            intent: data.intent || 'unknown',
            lead_temperature: data.lead_temperature || 'unknown',
            recommended_car_id: data.recommended_car_id,
            messageText: originalText
          });
        }
      };

      const findAndStripJSON = (text: string) => {
        let cleanedText = text;
        const originalText = text;
        
        // 1. Match JSON in markdown blocks
        const markdownJsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
        cleanedText = cleanedText.replace(markdownJsonRegex, (match, jsonString) => {
          try {
            const data = JSON.parse(jsonString);
            processJsonAction(data, originalText);
            return '';
          } catch (e) {
            return match;
          }
        });

        // 2. Match raw JSON objects
        const simpleJsonRegex = /\{[\s\S]*?\}/g;
        const matches = cleanedText.match(simpleJsonRegex);
        if (matches) {
          matches.forEach(match => {
            try {
              const data = JSON.parse(match);
              if (data.intent || data.action || data.lead_temperature || data.recommended_car_id) {
                processJsonAction(data, originalText);
                cleanedText = cleanedText.replace(match, '');
              }
            } catch (e) {}
          });
        }

        return cleanedText.trim();
      };

      responseText = findAndStripJSON(responseText);

      // Simulate typing effect
      setIsLoading(false);
      setIsTyping(true);
      
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        text: "",
        sender: 'ai',
        timestamp: new Date(),
        aiImages: aiImages.length > 0 ? aiImages : undefined,
        bookingProposal
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Initial "thinking" pause to feel more natural
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

      const words = responseText.split(' ');
      let currentText = "";
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? "" : " ") + words[i];
        setMessages((prev) => 
          prev.map(m => m.id === aiMessageId ? { ...m, text: currentText } : m)
        );
        
        // Base delay per word
        let delay = 25 + Math.random() * 50;
        
        // Factor in word length (longer words take slightly longer to "type")
        delay += words[i].length * 5;

        // Natural typing rhythm: longer pauses at punctuation
        const word = words[i].toLowerCase();
        if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) {
          delay += 600 + Math.random() * 400; // Significant pause at end of sentence
        } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
          delay += 250 + Math.random() * 200; // Medium pause at commas
        } else if (word.length > 8) {
          delay += 40 + Math.random() * 60; // Extra thought for long words
        }
        
        // Occasional "burst" of speed for short common words
        if (word.length < 3 && Math.random() > 0.7) {
          delay = 10;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      setIsTyping(false);
      
      // Log the complete AI message
      const finalAiMessage: Message = {
        id: aiMessageId,
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
        aiImages: aiImages.length > 0 ? aiImages : undefined,
        bookingProposal
      };
      logService.addMessageToSession(finalAiMessage);

      if (autoRead && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, there was an error processing your message. ${error instanceof Error ? error.message : 'Please check your API key.'}`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0b141a] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#202c33] border-l border-[#2f3b43] z-10">
        <div className="flex items-center cursor-pointer">
          <img
            src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
            alt="Abena"
            className="w-10 h-10 rounded-full object-cover mr-3"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col justify-center">
            <h2 className="text-[17px] font-semibold text-[#e9edef] leading-tight">Abena</h2>
            <p className={cn("text-[12px] mt-0.5 transition-colors", isTyping ? "text-[#00a884] font-medium" : "text-gray-300 font-normal")}>
              {isTyping ? "typing..." : "Private Chat"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-[#aebac1]">
          <button 
            onClick={toggleAutoRead} 
            className={cn("hover:bg-[#3b4a54] p-2 rounded-full transition-colors", autoRead ? "text-[#00a884]" : "text-[#aebac1]")}
            title={autoRead ? "Disable Auto-read" : "Enable Auto-read"}
          >
            {autoRead ? <Volume2 className="w-[22px] h-[22px]" /> : <VolumeX className="w-[22px] h-[22px]" />}
          </button>
          <button onClick={startCall} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors hidden sm:block">
            <Video className="w-[22px] h-[22px]" />
          </button>
          <button onClick={startCall} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <Phone className="w-[20px] h-[20px]" />
          </button>
          <button onClick={() => alert("Sharing this chat...")} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors hidden sm:block" title="Share Chat">
            <Share2 className="w-[20px] h-[20px]" />
          </button>
          <div className="w-[1px] h-6 bg-[#2f3b43] mx-1 hidden sm:block"></div>
          <button onClick={clearChat} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors" title="Clear Chat">
            <MoreVertical className="w-[22px] h-[22px]" />
          </button>
          {onClose && (
            <button onClick={onClose} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
              <X className="w-[22px] h-[22px]" />
            </button>
          )}
        </div>
      </div>

      {/* Calling Overlay */}
      {isCalling && (
        <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-8">
            <img
              src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
              alt="Abena"
              className="w-32 h-32 rounded-full object-cover border-4 border-[#00a884]"
            />
            <div className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-medium text-[#e9edef] mb-2">Abena</h2>
          <p className="text-[#8696a0] animate-pulse">Calling...</p>
          <button 
            onClick={() => setIsCalling(false)}
            className="mt-12 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <Phone className="w-8 h-8 text-white rotate-[135deg] fill-current" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 z-10">
        <div className="flex flex-col space-y-2 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex justify-center my-4">
              <div className="bg-[#ffeecd] text-gray-700 text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-md">
                Messages to this chat and calls are now secured with end-to-end encryption.
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              onConfirmBooking={handleConfirmBooking}
            />
          ))}
          
          {isLoading && (
            <div className="flex w-full mb-2 justify-start">
              <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="z-10">
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
