// frontend/components/ChatInterface.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader, Trash2, BookOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  sources?: string[];
}

interface Material {
  id: string;
  title: string;
  subject?: string;
  processing_status?: string;
}

interface ChatHistory {
  question: string;
  answer: string;
  timestamp: string;
}

export default function ChatInterface() {
  const { studentId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!studentId) return;

    loadMaterials(studentId);
    initializeSpeechRecognition();
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadChatHistory();
    }
  }, [studentId, selectedMaterial]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition) as any;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  };

  const loadMaterials = async (id?: string) => {
    try {
      const sid = id ?? studentId;
      if (!sid) {
        setMaterials([]);
        return;
      }

      const token = localStorage.getItem('token');
      const url = `${API_URL}/api/materials/${encodeURIComponent(sid)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        if (res.status === 404) {
          setMaterials([]);
          return;
        }
        setMaterials([]);
        return;
      }

      const text = await res.text();
      if (!text) {
        setMaterials([]);
        return;
      }

      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      
      if (!rows || rows.length === 0) {
        setMaterials([]);
        return;
      }

      const mapped = rows.map((m: any) => ({
        id: String(m.id ?? m._id ?? ''),
        title: m.title || m.file_name || 'Untitled',
        subject: m.subject || '',
        processing_status: m.processing_status || m.status || '',
      }));

      setMaterials(mapped);
    } catch (err) {
      console.error('[loadMaterials] error:', err);
      setMaterials([]);
    }
  };

  const loadChatHistory = async () => {
    try {
      if (!studentId) return;

      const materialParam = selectedMaterial === 'all' ? 'general' : selectedMaterial;
      const url = `${API_URL}/api/chat-history/${encodeURIComponent(studentId)}?material_id=${encodeURIComponent(materialParam)}`;

      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.history || []);
      } else {
        setChatHistory([]);
      }
    } catch (err) {
      console.error('[loadChatHistory] error:', err);
      setChatHistory([]);
    }
  };

  const clearChatHistory = async () => {
    if (!confirm('Clear chat history?')) return;

    try {
      if (!studentId) return;

      const materialParam = selectedMaterial === 'all' ? 'general' : selectedMaterial;
      const url = `${API_URL}/api/clear-history/${encodeURIComponent(studentId)}?material_id=${encodeURIComponent(materialParam)}`;

      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        setMessages([]);
        setChatHistory([]);
      }
    } catch (err) {
      console.error('[clearChatHistory] error:', err);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const parseAssistantResponse = (raw: any) => {
    const content =
      raw?.answer ??
      raw?.text ??
      raw?.content ??
      raw?.output ??
      raw?.response ??
      raw?.data?.answer ??
      '';

    const rawSources: any[] =
      raw?.sources ??
      raw?.sources_used ??
      raw?.references ??
      raw?.wikipedia ??
      raw?.data?.sources ??
      [];

    const sourcesArr = Array.isArray(rawSources)
      ? rawSources.map((s) => (typeof s === 'string' ? s : JSON.stringify(s))).filter(Boolean)
      : [];

    if (raw?.wikipedia && !Array.isArray(raw.wikipedia)) {
      sourcesArr.push(typeof raw.wikipedia === 'string' ? raw.wikipedia : JSON.stringify(raw.wikipedia));
    }

    return { content: String(content ?? ''), sources: Array.from(new Set(sourcesArr)) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !studentId) return;

    const questionText = input.trim();
    const userMessage: Message = {
      role: 'user',
      content: questionText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const payload: any = {
        student_id: String(studentId),
        question: questionText,
      };

      if (selectedMaterial && selectedMaterial !== 'all' && selectedMaterial !== 'none') {
        payload.material_id = selectedMaterial;
      }

      const rawResponse = await fetch(`${API_URL}/api/ask-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const respText = await rawResponse.text();
      
      let parsed: any = {};
      try {
        parsed = respText ? JSON.parse(respText) : {};
      } catch (err) {
        parsed = { answer: respText };
      }

      const { content, sources } = parseAssistantResponse(parsed);

      const assistantMessage: Message = {
        role: 'assistant',
        content: content || 'No answer returned',
        timestamp: new Date().toISOString(),
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceEnabled && assistantMessage.content) {
        speak(assistantMessage.content);
      }

      await loadMaterials();
      await loadChatHistory();
    } catch (error: any) {
      console.error('[handleSubmit] error:', error);
      const assistantMessage: Message = {
        role: 'assistant',
        content: `Sorry, an error occurred: ${String(error.message ?? error)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const completedMaterials = materials.filter((m) => (m.processing_status ?? '').toLowerCase() === 'completed');

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Ask Questions</h2>

          <select
            value={selectedMaterial}
            onChange={(e) => {
              setSelectedMaterial(e.target.value);
              setMessages([]);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Materials</option>
            {completedMaterials.length === 0 ? (
              <option value="none" disabled>
                No completed materials found
              </option>
            ) : (
              completedMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            title="View History"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          <button
            onClick={clearChatHistory}
            className="flex items-center px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
            title="Clear History"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center px-4 py-2 rounded-lg transition ${voiceEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="ml-2 text-sm">Voice</span>
          </button>
        </div>
      </div>

      {showHistory && chatHistory.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Recent History ({chatHistory.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chatHistory.slice(-5).reverse().map((item, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-medium text-blue-800">Q: {item.question}</p>
                <p className="text-blue-600 truncate">A: {item.answer.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Ask a question about your study materials</p>
            {completedMaterials.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <p className="font-semibold">No completed study materials available</p>
                <p className="text-sm mt-1">Upload materials and wait until processing completes.</p>
              </div>
            )}
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-4 py-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200 shadow-sm'}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">📚 Sources Used:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, idx) => (
                        <span key={idx} className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 flex items-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your study materials..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading || isListening}
        />

        {recognitionRef.current && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-lg transition ${isListening ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        {isSpeaking && (
          <button type="button" onClick={stopSpeaking} className="p-3 rounded-lg bg-orange-600 text-white transition">
            <VolumeX className="w-5 h-5" />
          </button>
        )}

        <button type="submit" disabled={loading || !input.trim()} className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}