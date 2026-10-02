import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import DashboardView from './components/DashboardView';
import SettingsModal from './components/SettingsModal';

const STORAGE_KEY = 'ai_data_analyst_chats_v1';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'dashboard'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [catalog, setCatalog] = useState({ active_dataset: null, tables: [] });
  const [loading, setLoading] = useState(false);

  // AI settings
  const [provider, setProvider] = useState('nvidia');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('muse-glimmer');

  // Multi-chat sessions state
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Initialize or load chat sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Error parsing stored chats:', e);
      }
    }

    // Default sample chat if none exist
    const defaultChat = {
      id: 'chat_' + Date.now(),
      title: 'Top 5 Customers by Revenue',
      createdAt: Date.now(),
      messages: [],
      activeDataset: 'sales_data',
    };
    setChats([defaultChat]);
    setActiveChatId(defaultChat.id);
  }, []);

  // Save chats to localStorage whenever they update
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }
  }, [chats]);

  // Fetch data catalog on mount
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

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0] || null;
  const currentMessages = activeChat?.messages || [];

  const handleSelectDataset = async (name) => {
    try {
      const res = await fetch('/api/select-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_name: name }),
      });
      if (res.ok) {
        fetchCatalog();
        // Update active chat's dataset
        if (activeChatId) {
          setChats((prev) =>
            prev.map((c) => (c.id === activeChatId ? { ...c, activeDataset: name } : c))
          );
        }
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

  const handleNewChat = () => {
    const newChat = {
      id: 'chat_' + Date.now(),
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      activeDataset: catalog.active_dataset || 'sales_data',
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveTab('chat');
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setActiveTab('chat');
    const targetChat = chats.find((c) => c.id === id);
    if (targetChat?.activeDataset && targetChat.activeDataset !== catalog.active_dataset) {
      handleSelectDataset(targetChat.activeDataset);
    }
  };

  const handleDeleteChat = (id) => {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeChatId === id) {
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          const fresh = {
            id: 'chat_' + Date.now(),
            title: 'New conversation',
            createdAt: Date.now(),
            messages: [],
            activeDataset: catalog.active_dataset || 'sales_data',
          };
          remaining.push(fresh);
          setActiveChatId(fresh.id);
        }
      }
      return remaining;
    });
  };

  const handleClearAllChats = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = {
      id: 'chat_' + Date.now(),
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      activeDataset: catalog.active_dataset || 'sales_data',
    };
    setChats([fresh]);
    setActiveChatId(fresh.id);
  };

  const handleSendMessage = async (queryText) => {
    const userMsg = { role: 'user', content: queryText };

    // Determine title for chat if it was new
    let updatedTitle = activeChat?.title;
    if (!updatedTitle || updatedTitle === 'New conversation' || currentMessages.length === 0) {
      updatedTitle = queryText.length > 36 ? queryText.slice(0, 36) + '...' : queryText;
    }

    // Append user message immediately
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              title: updatedTitle,
              messages: [...c.messages, userMsg],
            }
          : c
      )
    );

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
          base_url:
            provider === 'nvidia'
              ? 'https://integrate.api.nvidia.com/v1'
              : 'https://api.openai.com/v1',
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

        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? { ...c, messages: [...c.messages, assistantMsg] }
              : c
          )
        );
      } else {
        const errText = await res.text();
        const errorMsg = {
          role: 'assistant',
          content: `⚠️ Error executing request: ${errText}`,
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? { ...c, messages: [...c.messages, errorMsg] }
              : c
          )
        );
      }
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ Network error communicating with backend: ${err.message}`,
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchCatalog();
      } else {
        alert('Upload failed: ' + (await res.text()));
      }
    } catch (err) {
      alert('Error uploading file: ' + err.message);
    }
  };

  const handleExport = () => {
    window.open('/api/export-report', '_blank');
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar with Recent Chats */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Canvas Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <ChatArea
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(true)}
            activeDataset={catalog.active_dataset}
            catalog={catalog}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            loading={loading}
            onNewChat={handleNewChat}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onExportReport={handleExport}
            onUploadFile={handleFileUpload}
            model={model}
            setModel={setModel}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar for Dashboard View */}
            <div style={{
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-main)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('chat')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: '#ececec',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ← Back to Chat
                </button>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ececec' }}>
                  Executive KPI & Quality Dashboard
                </span>
              </div>

              <button
                onClick={handleExport}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: '#2f2f2f',
                  color: '#ececec',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Export Report
              </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
              <DashboardView activeDataset={catalog.active_dataset} />
            </div>
          </div>
        )}
      </main>

      {/* Settings Dialog Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={model}
        setModel={setModel}
        onClearAllChats={handleClearAllChats}
      />
    </div>
  );
}
