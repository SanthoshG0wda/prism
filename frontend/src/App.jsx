import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import DashboardView from './components/DashboardView';
import { MessageSquare, LayoutDashboard, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'dashboard'
  const [catalog, setCatalog] = useState({ active_dataset: null, tables: [] });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // AI settings
  const [provider, setProvider] = useState('nvidia');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('meta/llama-3.3-70b-instruct');

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    }
  };

  const handleSelectDataset = async (name) => {
    try {
      const res = await fetch('/api/select-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_name: name }),
      });
      if (res.ok) {
        fetchCatalog();
      }
    } catch (err) {
      console.error('Error selecting dataset:', err);
    }
  };

  const handleLoadSamples = async () => {
    try {
      const res = await fetch('/api/load-samples', { method: 'POST' });
      if (res.ok) {
        fetchCatalog();
      }
    } catch (err) {
      console.error('Error loading samples:', err);
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    try {
      await fetch('/api/clear-chat', { method: 'POST' });
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  const handleSendMessage = async (queryText) => {
    // Append user message immediately
    const userMsg = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          provider: provider,
          api_key: apiKey,
          model: model,
          base_url: provider === 'nvidia' ? 'https://integrate.api.nvidia.com/v1' : 'https://api.openai.com/v1',
        }),
      });

      if (res.ok) {
        const agentResponse = await res.json();
        const assistantMsg = {
          role: 'assistant',
          content: agentResponse.answer,
          steps_explanation: agentResponse.steps_explanation,
          tool_used: agentResponse.tool_used,
          tool_result: agentResponse.tool_result,
          generated_sql: agentResponse.generated_sql,
          generated_pandas_code: agentResponse.generated_pandas_code,
          chart_spec: agentResponse.chart_spec,
          anomalies: agentResponse.anomalies,
          execution_time_ms: agentResponse.execution_time_ms,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errText = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error executing request: ${errText}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Network error communicating with backend: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#131314' }}>
      {/* Sidebar */}
      <Sidebar
        catalog={catalog}
        activeDataset={catalog.active_dataset}
        onSelectDataset={handleSelectDataset}
        onUploadSuccess={fetchCatalog}
        onLoadSamples={handleLoadSamples}
        onClearChat={handleClearChat}
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={model}
        setModel={setModel}
      />

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Navbar */}
        <header style={{
          height: '56px',
          borderBottom: '1px solid #282a2c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          backgroundColor: '#131314',
          flexShrink: 0,
        }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '20px',
                border: activeTab === 'chat' ? '1px solid #3c4043' : 'none',
                backgroundColor: activeTab === 'chat' ? '#1e1f20' : 'transparent',
                color: activeTab === 'chat' ? '#8ab4f8' : '#9aa0a6',
                fontSize: '0.88rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={16} />
              <span>Conversational Analyst</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '20px',
                border: activeTab === 'dashboard' ? '1px solid #3c4043' : 'none',
                backgroundColor: activeTab === 'dashboard' ? '#1e1f20' : 'transparent',
                color: activeTab === 'dashboard' ? '#8ab4f8' : '#9aa0a6',
                fontSize: '0.88rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <LayoutDashboard size={16} />
              <span>Executive Dashboard</span>
            </button>
          </div>

          {/* Model Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: '#c4c7c5',
            backgroundColor: '#1e1f20',
            border: '1px solid #2d2f31',
            padding: '4px 12px',
            borderRadius: '16px',
          }}>
            <Sparkles size={14} color="#8ab4f8" />
            <span>NVIDIA NIM</span>
            <span style={{ color: '#5f6368' }}>•</span>
            <span style={{ color: '#9aa0a6' }}>{model.split('/')[-1]}</span>
          </div>
        </header>

        {/* Tab Viewport */}
        <div style={{ flexGrow: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
          {activeTab === 'chat' ? (
            <ChatArea
              activeDataset={catalog.active_dataset}
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={loading}
            />
          ) : (
            <DashboardView activeDataset={catalog.active_dataset} />
          )}
        </div>
      </main>
    </div>
  );
}
