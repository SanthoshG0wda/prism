import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ArtifactPanel from './components/ArtifactPanel';
import SettingsModal from './components/SettingsModal';

const STORAGE_KEY = 'ai_data_analyst_chats_v1';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [catalog, setCatalog] = useState({ active_dataset: null, tables: [] });
  const [loading, setLoading] = useState(false);

  // Claude-style Artifact state
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isArtifactMaximized, setIsArtifactMaximized] = useState(false);

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
          // Load active artifact if saved in the active chat
          const latestArt = parsed[0]?.messages?.findLast?.((m) => m.artifact)?.artifact;
          if (latestArt) {
            setActiveArtifact(latestArt);
          }
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
    setIsArtifactOpen(false);
    setActiveArtifact(null);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    const targetChat = chats.find((c) => c.id === id);
    if (targetChat?.activeDataset && targetChat.activeDataset !== catalog.active_dataset) {
      handleSelectDataset(targetChat.activeDataset);
    }
    // Check if selected chat has an artifact
    const chatArt = targetChat?.messages?.slice()?.reverse()?.find((m) => m.artifact)?.artifact;
    if (chatArt) {
      setActiveArtifact(chatArt);
    } else {
      setIsArtifactOpen(false);
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
    setIsArtifactOpen(false);
    setActiveArtifact(null);
  };

  const handleSendMessage = async (queryText, files = []) => {
    const hasFiles = files && files.length > 0;
    const cleanPrompt = queryText ? queryText.trim() : '';

    if (!cleanPrompt && !hasFiles) return;

    setLoading(true);

    let uploadedTables = [];
    if (hasFiles) {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errDetail = await uploadRes.text();
          throw new Error(errDetail);
        }

        const uploadData = await uploadRes.json();
        uploadedTables = uploadData.uploaded || [];
        await fetchCatalog();
      } catch (err) {
        setLoading(false);
        const errorMsg = {
          role: 'assistant',
          content: `⚠️ Error uploading attached file: ${err.message}`,
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId ? { ...c, messages: [...c.messages, errorMsg] } : c
          )
        );
        return;
      }
    }

    const attachments = hasFiles
      ? files.map((f) => ({
          name: f.name,
          size: f.size,
        }))
      : [];

    const userMsg = {
      role: 'user',
      content: cleanPrompt,
      attachments: attachments,
    };

    let effectiveQuery = cleanPrompt;
    if (!effectiveQuery && hasFiles) {
      const primaryTable =
        uploadedTables[0]?.table_name ||
        files[0].name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      effectiveQuery = `Profile and summarize the newly uploaded dataset '${primaryTable}'`;
    }

    let updatedTitle = activeChat?.title;
    if (!updatedTitle || updatedTitle === 'New conversation' || currentMessages.length === 0) {
      const titleBase = cleanPrompt || (hasFiles ? files[0].name : 'Data Analysis');
      updatedTitle = titleBase.length > 36 ? titleBase.slice(0, 36) + '...' : titleBase;
    }

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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: effectiveQuery,
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
          artifact: agentResponse.artifact || null,
          execution_time_ms: agentResponse.execution_time_ms,
        };

        // If the response generated a Claude-style artifact, open the side panel
        if (agentResponse.artifact) {
          setActiveArtifact(agentResponse.artifact);
          setIsArtifactOpen(true);
        }

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

      {/* Main Split Layout: Left Chat + Right Claude-style Artifact Panel */}
      <main style={{ flexGrow: 1, display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* Chat Conversation View */}
        <div
          style={{
            flexGrow: 1,
            width: isArtifactOpen && isArtifactMaximized ? '0%' : (isArtifactOpen ? '48%' : '100%'),
            height: '100%',
            display: isArtifactOpen && isArtifactMaximized ? 'none' : 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}
        >
          <ChatArea
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(true)}
            activeDataset={catalog.active_dataset}
            catalog={catalog}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            loading={loading}
            onNewChat={handleNewChat}
            onExportReport={handleExport}
            model={model}
            setModel={setModel}
            activeArtifact={activeArtifact}
            onOpenArtifact={(art) => {
              setActiveArtifact(art);
              setIsArtifactOpen(true);
            }}
          />
        </div>

        {/* Claude-style Interactive Artifact Side Panel */}
        <ArtifactPanel
          artifact={activeArtifact}
          isOpen={isArtifactOpen}
          onClose={() => setIsArtifactOpen(false)}
          isMaximized={isArtifactMaximized}
          onToggleMaximize={() => setIsArtifactMaximized(!isArtifactMaximized)}
        />
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
