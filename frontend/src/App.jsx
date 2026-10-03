import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ArtifactPanel from './components/ArtifactPanel';
import SettingsModal from './components/SettingsModal';
import { getApiUrl } from './utils/api';

const STORAGE_KEY = 'ai_data_analyst_chats_v1';
const SESSION_KEY = 'ai_data_analyst_session_id';
const SETTINGS_KEY = 'ai_data_analyst_settings_v1';
const DEFAULT_MODEL = 'meta/muse-glimmer-30b';

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'nvidia',
        apiKey: parsed.apiKey || '',
        model: parsed.model || DEFAULT_MODEL,
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { provider: 'nvidia', apiKey: '', model: DEFAULT_MODEL };
}

function getSessionId() {
  let sid = null;
  try {
    sid = localStorage.getItem(SESSION_KEY);
  } catch {
    sid = null;
  }
  if (!sid) {
    sid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(SESSION_KEY, sid);
    } catch {
      /* storage unavailable */
    }
  }
  return sid;
}

function apiFetch(url, options = {}) {
  const fullUrl = getApiUrl(url);
  const headers = { ...(options.headers || {}), 'X-Session-Id': getSessionId() };
  return fetch(fullUrl, { ...options, headers });
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [catalog, setCatalog] = useState({ active_dataset: null, tables: [] });
  const [loading, setLoading] = useState(false);

  // Claude-style Artifact state
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isArtifactMaximized, setIsArtifactMaximized] = useState(false);

  // AI settings (persisted so the key/model survive refresh)
  const [provider, setProvider] = useState(() => loadStoredSettings().provider);
  const [apiKey, setApiKey] = useState(() => loadStoredSettings().apiKey);
  const [model, setModel] = useState(() => loadStoredSettings().model);

  // Server-side LLM status (env key). Live = server key OR key typed in Settings.
  const [serverLlmLive, setServerLlmLive] = useState(false);
  const [serverLlmModel, setServerLlmModel] = useState(DEFAULT_MODEL);
  const llmLive = serverLlmLive || apiKey.trim().length > 5;

  // Key/endpoint self-test state (Settings → Test connection).
  const [llmTest, setLlmTest] = useState({ state: 'idle', message: '' });

  const handleTestConnection = async () => {
    setLlmTest({ state: 'testing', message: 'Contacting provider…' });
    try {
      const res = await apiFetch('/api/llm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          model,
          base_url:
            provider === 'nvidia'
              ? 'https://integrate.api.nvidia.com/v1'
              : 'https://api.openai.com/v1',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Request failed (${res.status})`);
      }
      setLlmTest({
        state: 'ok',
        message: `Key valid, connected (${data.models_count} models). ${data.model_listed ? `${data.model} is available.` : `${data.model} is NOT listed for this key.`}`,
      });
      fetchLlmStatus();
    } catch (err) {
      setLlmTest({ state: 'error', message: err.message });
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ provider, apiKey, model }));
    } catch {
      /* storage unavailable */
    }
  }, [provider, apiKey, model]);

  // Multi-chat sessions state
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const abortRef = useRef(null);

  // Initialize or load chat sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map((c) => ({
            ...c,
            sessionId: c.sessionId || ('ses_' + c.id),
          }));
          setChats(migrated);
          setActiveChatId(migrated[0].id);
          try {
            localStorage.setItem(SESSION_KEY, migrated[0].sessionId);
          } catch {}
          // Load active artifact if saved in the active chat
          const latestArt = migrated[0]?.messages?.findLast?.((m) => m.artifact)?.artifact;
          if (latestArt) {
            setActiveArtifact(latestArt);
          }
          return;
        }
      } catch (e) {
        console.error('Error parsing stored chats:', e);
      }
    }

    // Default empty chat if none exist
    const freshSid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(SESSION_KEY, freshSid);
    } catch {}
    const defaultChat = {
      id: 'chat_' + Date.now(),
      sessionId: freshSid,
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      activeDataset: null,
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

  // Fetch data catalog + server LLM status on mount
  useEffect(() => {
    fetchCatalog();
    fetchLlmStatus();
  }, []);

  const fetchLlmStatus = async () => {
    try {
      const res = await apiFetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerLlmLive(!!data.llm_live);
        if (data.llm_model) setServerLlmModel(data.llm_model);
      }
    } catch (err) {
      console.error('Failed to fetch LLM status:', err);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await apiFetch('/api/catalog');
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
      const res = await apiFetch('/api/select-dataset', {
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
    const freshSid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(SESSION_KEY, freshSid);
    } catch {}
    const newChat = {
      id: 'chat_' + Date.now(),
      sessionId: freshSid,
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      activeDataset: null,
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsArtifactOpen(false);
    setActiveArtifact(null);
    setCatalog({ active_dataset: null, tables: [] });
    setTimeout(() => fetchCatalog(), 20);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    const targetChat = chats.find((c) => c.id === id);
    if (targetChat) {
      const sid = targetChat.sessionId || ('ses_' + targetChat.id);
      try {
        localStorage.setItem(SESSION_KEY, sid);
      } catch {}
      setTimeout(() => {
        fetchCatalog();
        if (targetChat.activeDataset) {
          handleSelectDataset(targetChat.activeDataset);
        }
      }, 20);
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
    const chatToDelete = chats.find((c) => c.id === id);
    if (chatToDelete?.sessionId) {
      try {
        fetch(getApiUrl('/api/session'), {
          method: 'DELETE',
          headers: { 'X-Session-Id': chatToDelete.sessionId },
        }).catch(() => {});
      } catch {}
    }
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeChatId === id) {
        if (remaining.length > 0) {
          const nextChat = remaining[0];
          const nextSid = nextChat.sessionId || ('ses_' + nextChat.id);
          try {
            localStorage.setItem(SESSION_KEY, nextSid);
          } catch {}
          setActiveChatId(nextChat.id);
          setTimeout(() => fetchCatalog(), 20);
        } else {
          const freshSid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
          try {
            localStorage.setItem(SESSION_KEY, freshSid);
          } catch {}
          const fresh = {
            id: 'chat_' + Date.now(),
            sessionId: freshSid,
            title: 'New conversation',
            createdAt: Date.now(),
            messages: [],
            activeDataset: null,
          };
          remaining.push(fresh);
          setActiveChatId(fresh.id);
          setCatalog({ active_dataset: null, tables: [] });
          setTimeout(() => fetchCatalog(), 20);
        }
      }
      return remaining;
    });
  };

  const handleClearAllChats = () => {
    chats.forEach((c) => {
      if (c.sessionId) {
        try {
          fetch(getApiUrl('/api/session'), {
            method: 'DELETE',
            headers: { 'X-Session-Id': c.sessionId },
          }).catch(() => {});
        } catch {}
      }
    });
    localStorage.removeItem(STORAGE_KEY);
    const freshSid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(SESSION_KEY, freshSid);
    } catch {}
    const fresh = {
      id: 'chat_' + Date.now(),
      sessionId: freshSid,
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      activeDataset: null,
    };
    setChats([fresh]);
    setActiveChatId(fresh.id);
    setIsArtifactOpen(false);
    setActiveArtifact(null);
    setCatalog({ active_dataset: null, tables: [] });
    setTimeout(() => fetchCatalog(), 20);
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
        const uploadRes = await apiFetch('/api/upload', {
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
      await streamAnswer(activeChatId, effectiveQuery);
    } finally {
      setLoading(false);
    }
  };

  const patchMessage = (chatId, msgId, patch) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
          : c
      )
    );
  };

  const replaceMessage = (chatId, msgId, msg) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? msg : m)) }
          : c
      )
    );
  };

  // ChatGPT-style streaming answer over SSE (/api/chat-stream).
  const streamAnswer = async (chatId, query) => {
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const placeholder = {
      id: msgId,
      role: 'assistant',
      content: '',
      streaming: true,
      status: 'Connecting…',
      steps_explanation: [],
    };
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, placeholder] } : c))
    );

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    let acc = '';
    let status = 'Thinking…';

    try {
      const res = await apiFetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          provider,
          api_key: apiKey,
          model,
          base_url:
            provider === 'nvidia'
              ? 'https://integrate.api.nvidia.com/v1'
              : 'https://api.openai.com/v1',
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          let evt;
          try {
            evt = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (evt.type === 'token') {
            acc += evt.text || '';
            patchMessage(chatId, msgId, { content: acc, status });
          } else if (evt.type === 'status') {
            status = evt.text || status;
            patchMessage(chatId, msgId, { status });
          } else if (evt.type === 'result') {
            const r = evt.response;
            if (r.artifact) {
              setActiveArtifact(r.artifact);
              setIsArtifactOpen(true);
            }
            replaceMessage(chatId, msgId, {
              id: msgId,
              role: 'assistant',
              content: r.answer,
              steps_explanation: r.steps_explanation,
              tool_used: r.tool_used,
              tool_result: r.tool_result,
              generated_sql: r.generated_sql,
              generated_pandas_code: r.generated_pandas_code,
              chart_spec: r.chart_spec,
              anomalies: r.anomalies,
              artifact: r.artifact || null,
              execution_time_ms: r.execution_time_ms,
              streaming: false,
            });
            return;
          } else if (evt.type === 'error') {
            throw new Error(evt.message || 'Stream failed');
          }
        }
      }
      // Stream closed without a result event: keep partial text.
      patchMessage(chatId, msgId, { streaming: false, status: 'Stopped' });
    } catch (err) {
      if (err.name === 'AbortError') {
        patchMessage(chatId, msgId, {
          content: acc || '*Response stopped.*',
          streaming: false,
          status: 'Stopped',
        });
      } else {
        replaceMessage(chatId, msgId, {
          id: msgId,
          role: 'assistant',
          content: `⚠️ Error executing request: ${err.message}`,
          streaming: false,
        });
      }
    } finally {
      setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const handleRegenerate = () => {
    const chat = chats.find((c) => c.id === activeChatId);
    if (!chat || loading) return;
    const msgs = chat.messages;
    let aIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && !msgs[i].streaming) { aIdx = i; break; }
    }
    if (aIdx < 0) return;
    let query = null;
    for (let i = aIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].content) { query = msgs[i].content; break; }
    }
    if (!query) return;
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, messages: c.messages.slice(0, aIdx) } : c
      )
    );
    setLoading(true);
    streamAnswer(activeChatId, query).finally(() => setLoading(false));
  };

  const handleExport = () => {
    window.open(getApiUrl('/api/export-report'), '_blank');
  };

  // Explicit opt-in demo helper: loads bundled sample CSVs into this session.
  // Never called automatically; sessions start empty per the assignment.
  const handleLoadSamples = async () => {
    try {
      const res = await apiFetch('/api/load-samples', { method: 'POST' });
      if (res.ok) {
        await fetchCatalog();
      }
    } catch (err) {
      console.error('Failed to load samples:', err);
    }
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
            onLoadSamples={handleLoadSamples}
            onStop={handleStop}
            onRegenerate={handleRegenerate}
            llmLive={llmLive}
            llmModel={apiKey.trim() ? model : serverLlmModel}
            onOpenSettings={() => setIsSettingsOpen(true)}
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
        onClose={() => { setIsSettingsOpen(false); setLlmTest({ state: 'idle', message: '' }); }}
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={model}
        setModel={setModel}
        llmTest={llmTest}
        onTestConnection={handleTestConnection}
        onClearAllChats={handleClearAllChats}
      />
    </div>
  );
}
