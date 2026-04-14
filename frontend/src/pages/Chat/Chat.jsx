import React, { useState, useRef, useEffect } from 'react';
import { aiApi, getApiData, getApiPayload } from '../../services/api';
import toast from 'react-hot-toast';
import './chat.css';
import { SUGGESTIONS, formatMessage } from './chatData';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      content: "👋 Hello! I'm **SmartChain AI**, your intelligent supply chain assistant.\n\nI can help you with:\n• 📦 Shipment status and tracking\n• ⚠️ Delay prediction and risk analysis\n• 🗺️ Route optimization\n• 🌤️ Weather impact assessment\n• 📊 Analytics and trends\n\nWhat would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (msg) => {
    const text = (msg || input).trim();
    if (!text) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build conversation history for context
    const history = messages.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

    try {
      const res = await aiApi.chat(text, history);
      const payload = getApiPayload(res);
      const data = getApiData(res, {});
      console.log('[Chat] ai chat response:', payload);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: data.message || 'No response message received.',
        timestamp: new Date(data.timestamp || Date.now()),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[Chat] ai response failed:', err.message);
      toast.error('AI response failed: ' + err.message);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: 'I apologize, I encountered an issue processing your request. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="page-content" style={{ height: 'calc(100vh - var(--header-height) - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div className="page-header-left">
          <h1 className="page-title">💬 AI Chat Assistant</h1>
          <p className="page-subtitle">Powered by Google Gemini · Ask anything about your supply chain</p>
        </div>
        <div className="ai-active-pill">
          <span className="live-dot" />
          Gemini Active
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Chat Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble-wrapper ${msg.role}`}>
                <div className={`chat-avatar ${msg.role === 'ai' ? 'ai-avatar' : 'user-avatar'}`}>
                  {msg.role === 'ai' ? '🤖' : '👤'}
                </div>
                <div>
                  <div className={`chat-bubble ${msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'}`}>
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  </div>
                  <div className="chat-time" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="chat-bubble-wrapper ai">
                <div className="chat-avatar ai-avatar">🤖</div>
                <div className="chat-bubble ai-bubble">
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: '6px', height: '6px',
                        background: 'var(--accent-primary)',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: `typing-dot 1.2s ${i * 0.2}s infinite ease-in-out`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask about shipments, delays, routes... (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ height: '44px', width: '44px', padding: 0, justifyContent: 'center', fontSize: '18px' }}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '14px' }}>💡 Quick Questions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', fontSize: '12px', height: 'auto', lineHeight: 1.4 }}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* AI Capabilities */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>🤖 AI Capabilities</div>
            {[
              { icon: '🔮', label: 'Delay Prediction', desc: 'Estimate delay probability' },
              { icon: '🗺️', label: 'Route Optimization', desc: 'Find best routes' },
              { icon: '🌤️', label: 'Weather Analysis', desc: 'Impact assessment' },
              { icon: '📊', label: 'Risk Assessment', desc: 'Real-time risk scoring' },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Chat;
