import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, X, Square } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Attachment } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, attachment?: Attachment) => void;
  isLoading: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string, file: File } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition', err);
      }
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachmentPreview) || isLoading) return;

    let attachmentData: Attachment | undefined;

    if (attachmentPreview) {
      const reader = new FileReader();
      reader.readAsDataURL(attachmentPreview.file);
      await new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          attachmentData = {
            type: 'image',
            data: base64,
            mimeType: attachmentPreview.file.type,
            url: attachmentPreview.url
          };
          resolve(null);
        };
      });
    }

    onSendMessage(text.trim(), attachmentData);
    setText('');
    setAttachmentPreview(null);
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentPreview({
        url: URL.createObjectURL(file),
        file
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          onSendMessage('', { 
            type: 'audio', 
            data: base64, 
            mimeType: 'audio/webm', 
            url: URL.createObjectURL(audioBlob) 
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const onEmojiClick = (emojiObject: any) => {
    setText(prev => prev + emojiObject.emoji);
  };

  return (
    <div className="relative flex flex-col w-full bg-[#202c33]">
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width={300} height={400} />
        </div>
      )}
      
      {attachmentPreview && (
        <div className="p-4 bg-[#202c33] border-b border-[#2f3b43] flex items-start">
          <div className="relative inline-block">
            <img src={attachmentPreview.url} alt="Preview" className="h-24 rounded-lg object-cover" />
            <button 
              onClick={() => setAttachmentPreview(null)}
              className="absolute -top-2 -right-2 bg-[#111b21] text-white rounded-full p-1 hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center px-4 py-2 w-full">
        <div className="flex space-x-4 text-[#8696a0] mr-4">
          <button onClick={() => setShowEmoji(!showEmoji)} className="hover:text-[#d1d7db] transition-colors">
            <Smile className="w-[26px] h-[26px]" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="hover:text-[#d1d7db] transition-colors">
            <Paperclip className="w-[26px] h-[26px]" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <div className="flex-1 bg-[#2a3942] rounded-[8px] px-4 py-2 flex items-center shadow-sm">
          {isRecording ? (
            <div className="flex items-center text-[#f15c6d] animate-pulse w-full">
              <Mic className="w-5 h-5 mr-2" />
              <span className="text-[15px] font-normal">Recording... {formatTime(recordingTime)}</span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              className="w-full bg-transparent border-none focus:outline-none text-[15px] text-[#d1d7db] placeholder-[#8696a0]"
              disabled={isLoading}
            />
          )}
        </div>

        <div className="ml-4 flex items-center space-x-2 text-[#8696a0]">
          {/* Voice to Text Button */}
          <button 
            onClick={toggleListening} 
            disabled={isLoading || isRecording}
            className={`hover:text-[#d1d7db] transition-colors disabled:opacity-50 ${isListening ? 'text-[#00a884] animate-pulse' : ''}`}
            title="Voice to Text"
          >
            <Mic className={`w-[26px] h-[26px] ${isListening ? 'fill-current' : ''}`} />
          </button>

          {text.trim() || attachmentPreview ? (
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="hover:text-[#d1d7db] transition-colors disabled:opacity-50"
            >
              <Send className="w-[26px] h-[26px] text-[#00a884]" />
            </button>
          ) : isRecording ? (
            <button onClick={stopRecording} className="hover:text-[#f15c6d] text-[#f15c6d] transition-colors">
              <Square className="w-[26px] h-[26px] fill-current" />
            </button>
          ) : (
            <button 
              onClick={startRecording} 
              disabled={isLoading || isListening} 
              className="hover:text-[#d1d7db] transition-colors disabled:opacity-50"
              title="Voice Note"
            >
              <Mic className="w-[26px] h-[26px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
