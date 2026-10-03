import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  Award,
  Calendar,
  Copy,
  Check,
  Table,
  PanelLeftOpen,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  FileSpreadsheet,
  Download,
  LayoutDashboard,
  SquarePen,
  ArrowUpRight,
  RotateCcw,
  Square,
  X,
  UploadCloud,
} from 'lucide-react';
import ChartRenderer from './ChartRenderer';
import MarkdownRenderer from './MarkdownRenderer';

const SLASH_COMMANDS = [
  {
    cmd: '/dashboard',
    label: 'Build Executive Dashboard',
    desc: 'Interactive Claude-style artifact with KPI cards & quality audit',
    prompt: 'Generate an Executive Dashboard artifact for the active dataset',
    icon: LayoutDashboard,
    badge: 'Artifact',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeColor: '#60a5fa',
  },
  {
    cmd: '/anomalies',
    label: 'Detect Anomalies & Outliers',
    desc: 'Audit numeric columns for statistical outliers using Tukey IQR & Z-scores',
    prompt: 'Detect statistical anomalies and outliers in the dataset and explain why they were flagged',
    icon: AlertOctagon,
    badge: 'Audit',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeColor: '#f87171',
  },
  {
    cmd: '/quality',
    label: 'Data Quality Audit',
    desc: 'Check completeness score, duplicate rows, missing values & column warnings',
    prompt: 'Run a comprehensive data quality check on the active dataset',
    icon: Check,
    badge: 'Quality',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeColor: '#34d399',
  },
  {
    cmd: '/profile',
    label: 'Profile Dataset Schema',
    desc: 'Compute column datatypes, distributions, null rates, and sample values',
    prompt: 'Profile and summarize all columns in the dataset',
    icon: FileSpreadsheet,
    badge: 'Profiling',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeColor: '#a78bfa',
  },
  {
    cmd: '/sql',
    label: 'DuckDB SQL Engine',
    desc: 'Execute fast analytical DuckDB SQL query with aggregations & limit',
    prompt: 'Generate and execute a DuckDB SQL query to analyze the active dataset',
    icon: Table,
    badge: 'DuckDB',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeColor: '#fbbf24',
  },
  {
    cmd: '/forecast',
    label: 'Forecast Metric Trend',
    desc: 'Project future values with 95% confidence intervals based on trends',
    prompt: 'Forecast metric trends with 95% confidence intervals',
    icon: TrendingUp,
    badge: 'Predictive',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeColor: '#f472b6',
  },
  {
    cmd: '/chart',
    label: 'Interactive Visualization',
    desc: 'Render interactive Plotly chart (bar, line, scatter, or pie)',
    prompt: 'Generate an interactive chart visualizing the key metrics of the dataset',
    icon: Sparkles,
    badge: 'Plotly',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    badgeColor: '#22d3ee',
  },
];

export default function ChatArea({
  sidebarOpen,
  onToggleSidebar,
  activeDataset,
  catalog,
  messages,
  onSendMessage,
  loading,
  onNewChat,
  onExportReport,
  onLoadSamples,
  onStop,
  onRegenerate,
  llmLive,
  llmModel,
  onOpenSettings,
  model,
  setModel,
  activeArtifact,
  onOpenArtifact,
}) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [openThinking, setOpenThinking] = useState({});
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Index of the latest finished assistant message (regenerate target).
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && !messages[i].streaming) {
      lastAssistantIdx = i;
      break;
    }
  }
  const hasStreamingMsg = messages.some((m) => m.streaming);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleFilesAdded = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newItems = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type === '') {
        newItems.push({
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          file: file,
          name: file.name,
          size: file.size,
        });
      }
    }
    if (newItems.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileSelect = (e) => {
    handleFilesAdded(e.target.files);
    if (e.target) e.target.value = '';
  };

  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [selectedSlashIdx, setSelectedSlashIdx] = useState(0);

  const filteredSlashCommands = SLASH_COMMANDS.filter((c) => {
    if (!input.startsWith('/')) return true;
    const search = input.toLowerCase();
    return c.cmd.toLowerCase().includes(search) || c.label.toLowerCase().includes(search.slice(1));
  });

  const handleExecuteSlash = (cmd) => {
    setSlashMenuOpen(false);
    setInput('');
    onSendMessage(cmd.prompt, attachedFiles.map((f) => f.file));
    setAttachedFiles([]);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.startsWith('/')) {
      setSlashMenuOpen(true);
      setSelectedSlashIdx(0);
    } else if (slashMenuOpen && !val.includes('/')) {
      setSlashMenuOpen(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (slashMenuOpen && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIdx((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIdx((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredSlashCommands[selectedSlashIdx] || filteredSlashCommands[0];
        if (chosen) {
          handleExecuteSlash(chosen);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
    }
  };

  const handleRemoveFile = (id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;
    setSlashMenuOpen(false);
    onSendMessage(input.trim(), attachedFiles.map((f) => f.file));
    setInput('');
    setAttachedFiles([]);
  };

  const handleCardClick = (promptText) => {
    if (loading) return;
    onSendMessage(promptText);
  };

  const toggleThinking = (idx) => {
    setOpenThinking((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const starterCards = [
    {
      title: 'Generate Executive Dashboard',
      desc: 'Build an interactive KPI & data quality artifact for your dataset',
      icon: <LayoutDashboard size={18} color="#10a37f" />,
      query: 'Generate an Executive Dashboard artifact for the active dataset.',
    },
    {
      title: 'Top 5 Customers by Revenue',
      desc: 'Rank key client accounts by total gross volume',
      icon: <Award size={18} color="#f59e0b" />,
      query: 'What are the top 5 customers by revenue?',
    },
    {
      title: 'Monthly Sales Trend',
      desc: 'Resample monthly sales & generate interactive line chart',
      icon: <TrendingUp size={18} color="#3b82f6" />,
      query: 'Show the monthly sales trend chart.',
    },
    {
      title: 'Detect Statistical Outliers',
      desc: 'Scan revenue anomalies using Tukey IQR fences',
      icon: <AlertOctagon size={18} color="#ef4444" />,
      query: 'Detect anomalies in revenue and explain why they were flagged.',
    },
  ];

  const availableModels = [
    { id: 'meta/muse-glimmer-30b', name: 'Reasoning 30B', badge: 'Default' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Instruct 70B', badge: 'High Reasoning' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Analytical 70B', badge: 'Analytical' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Fast 8B', badge: 'Fast' },
  ];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFilesAdded(e.dataTransfer.files);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        backgroundColor: 'var(--bg-main)',
        overflow: 'hidden',
      }}
    >
      {/* Drag & Drop Visual Overlay (ChatGPT style) */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          inset: '16px',
          backgroundColor: 'rgba(23, 23, 23, 0.90)',
          backdropFilter: 'blur(6px)',
          border: '2px dashed #10a37f',
          borderRadius: '20px',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 163, 127, 0.15)',
            border: '1px solid #10a37f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10a37f',
          }}>
            <UploadCloud size={32} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ececec' }}>
            Drop CSV files to attach
          </div>
          <div style={{ fontSize: '0.86rem', color: '#8e8e8e' }}>
            Files will be attached to your prompt
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-main)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Left: Sidebar toggle (when closed) + Model Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              title="Open sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b4b4b4',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <PanelLeftOpen size={20} />
            </button>
          )}

          {/* Model Selector Dropdown Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '10px',
                backgroundColor: showModelMenu ? '#2f2f2f' : 'transparent',
                border: 'none',
                color: '#ececec',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
              onMouseLeave={(e) => {
                if (!showModelMenu) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>Prism</span>
              <span style={{ color: '#737373', fontSize: '0.82rem', fontWeight: 400 }}>
                • {availableModels.find((m) => m.id === model)?.name || 'Prism'}
              </span>
              <ChevronDown size={15} color="#b4b4b4" />
            </button>

            {/* Live LLM vs offline-heuristic indicator */}
            <button
              onClick={() => !llmLive && onOpenSettings && onOpenSettings()}
              title={llmLive
                ? 'Live LLM active'
                : 'Offline heuristic mode — click to add your API key in Settings'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                backgroundColor: llmLive ? 'rgba(16, 163, 127, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${llmLive ? 'rgba(16, 163, 127, 0.45)' : 'rgba(245, 158, 11, 0.45)'}`,
                color: llmLive ? '#10a37f' : '#f59e0b',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: llmLive ? 'default' : 'pointer',
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: llmLive ? '#10a37f' : '#f59e0b',
              }} />
              <span>{llmLive ? 'Live LLM' : 'Offline — add key'}</span>
            </button>

            {/* Model Dropdown Menu */}
            {showModelMenu && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '0',
                width: '280px',
                backgroundColor: '#171717',
                border: '1px solid #383838',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
              }}>
                <div style={{ fontSize: '0.72rem', color: '#737373', padding: '6px 10px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Select Model
                </div>
                {availableModels.map((m) => {
                  const isSelected = m.id === model;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setModel(m.id);
                        setShowModelMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#212121' : 'transparent',
                        color: isSelected ? '#fff' : '#b4b4b4',
                        fontSize: '0.85rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#212121';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} color={isSelected ? '#10a37f' : '#737373'} />
                        <span>{m.name}</span>
                      </div>
                      {isSelected && <Check size={14} color="#10a37f" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Dataset Pill */}
          {activeDataset && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#171717',
              border: '1px solid #2f2f2f',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              color: '#b4b4b4',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10a37f' }} />
              <FileSpreadsheet size={13} color="#10a37f" />
              <span>{activeDataset}</span>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Claude-style Artifact Header Shortcut (when an artifact exists) */}
          {activeArtifact && (
            <button
              onClick={() => onOpenArtifact(activeArtifact)}
              title="Open Executive Dashboard Artifact"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 163, 127, 0.15)',
                border: '1px solid rgba(16, 163, 127, 0.4)',
                color: '#10a37f',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.15)')}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard Artifact</span>
              <ArrowUpRight size={13} />
            </button>
          )}

          <button
            onClick={onExportReport}
            title="Export Executive HTML Report"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: '#b4b4b4',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2f2f2f';
              e.currentTarget.style.color = '#ececec';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#b4b4b4';
            }}
          >
            <Download size={15} />
            <span>Report</span>
          </button>

          <button
            onClick={onNewChat}
            title="New chat"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b4b4b4',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <SquarePen size={18} />
          </button>
        </div>
      </header>

      {/* Main Conversation Canvas */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '24px 20px 120px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '768px' }}>
          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: '60px',
              paddingBottom: '40px',
            }}>
              {/* ChatGPT Icon Symbol */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              }}>
                <Sparkles size={26} color="#000" />
              </div>

              <h1 style={{
                fontSize: '1.95rem',
                fontWeight: 600,
                color: '#ececec',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}>
                What can I help with?
              </h1>
              <p style={{ fontSize: '0.95rem', color: '#737373', marginBottom: '20px' }}>
                Upload your CSV dataset and request on-demand analytical dashboards & insights.
              </p>

              {/* Explicit opt-in demo data (sessions start empty; never auto-loaded) */}
              {catalog && (catalog.tables || []).length === 0 && onLoadSamples && (
                <button
                  onClick={onLoadSamples}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(16, 163, 127, 0.12)',
                    border: '1px solid rgba(16, 163, 127, 0.45)',
                    color: '#10a37f',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginBottom: '36px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.22)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.12)')}
                >
                  <FileSpreadsheet size={15} />
                  <span>Or load sample datasets to try it out</span>
                </button>
              )}

              {/* 4 Prompt Suggestion Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '12px',
                width: '100%',
              }}>
                {starterCards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCardClick(card.query)}
                    className="card-hover"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '16px',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      minHeight: '84px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#ececec', marginBottom: '4px' }}>
                        {card.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#737373' }}>
                        {card.desc}
                      </div>
                    </div>
                    <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#2a2a2a', flexShrink: 0, marginLeft: '12px' }}>
                      {card.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Feed */}
          {messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '28px', width: '100%' }}>
              {msg.role === 'user' ? (
                /* User Message */
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <div className="user-bubble" style={{ maxWidth: '85%' }}>
                    {/* ChatGPT-style Attached File Pill Cards */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: msg.content ? '10px' : '0',
                      }}>
                        {msg.attachments.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '10px',
                              backgroundColor: '#262626',
                              border: '1px solid #383838',
                              borderRadius: '12px',
                              padding: '8px 12px',
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(16, 163, 127, 0.15)',
                              border: '1px solid rgba(16, 163, 127, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#10a37f',
                              flexShrink: 0,
                            }}>
                              <FileSpreadsheet size={16} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#ececec' }}>
                                {att.name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#8e8e8e' }}>
                                CSV {att.size ? `• ${(att.size / 1024).toFixed(1)} KB` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.is_upload && !msg.attachments && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#10a37f' }}>
                        <FileSpreadsheet size={16} />
                        <span style={{ fontWeight: 600 }}>File Upload</span>
                      </div>
                    )}
                    {msg.content && <div>{msg.content}</div>}
                  </div>
                </div>
              ) : (
                /* Assistant Message */
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#10a37f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <Sparkles size={16} color="#fff" />
                  </div>

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    {/* Live streaming status (ChatGPT-style) */}
                    {msg.streaming && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#b4b4b4',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#262626',
                        marginBottom: '10px',
                      }}>
                        <Sparkles size={13} color="#10a37f" />
                        <span className="pulse-thinking">{msg.status || 'Thinking…'}</span>
                      </div>
                    )}
                    {/* ChatGPT o1/o3-style Thinking Accordion (shown for analytical queries) */}
                    {msg.steps_explanation &&
                      msg.steps_explanation.length > 0 &&
                      !msg.tool_used?.startsWith('conversational_') && (
                      <div style={{ marginBottom: '12px' }}>
                        <div
                          onClick={() => toggleThinking(idx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            color: '#b4b4b4',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            padding: '4px 8px',
                            borderRadius: '8px',
                            backgroundColor: '#262626',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#262626')}
                        >
                          <Sparkles size={13} color="#10a37f" />
                          <span>Thought for {Math.max(0.4, (msg.execution_time_ms ? msg.execution_time_ms / 1000 : 1.2)).toFixed(1)} seconds</span>
                          {openThinking[idx] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </div>

                        {openThinking[idx] && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #2d2d2d',
                            marginTop: '8px',
                            fontSize: '0.8rem',
                            color: '#b4b4b4',
                          }}>
                            {msg.steps_explanation.map((step, sIdx) => (
                              <div key={sIdx} style={{ padding: '3px 0', fontFamily: 'monospace', color: '#9aa0a6' }}>
                                • {step}
                              </div>
                            ))}
                            {msg.tool_used && (
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10a37f' }}>
                                ⚡ Verified via DuckDB Engine: <code>{msg.tool_used}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Assistant Text rendered as Rich Markdown */}
                    <div style={{
                      fontSize: '0.96rem',
                      lineHeight: 1.7,
                      color: '#ececec',
                      wordBreak: 'break-word',
                    }}>
                      <MarkdownRenderer content={msg.content} />
                      {msg.streaming && (
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '1.05em',
                          backgroundColor: '#ececec',
                          marginLeft: '3px',
                          verticalAlign: 'text-bottom',
                          animation: 'blink 1s step-end infinite',
                        }} />
                      )}
                    </div>

                    {/* Claude-style Artifact Card (When Dashboard artifact is generated) */}
                    {msg.artifact && (
                      <div
                        onClick={() => onOpenArtifact(msg.artifact)}
                        className="card-hover"
                        style={{
                          marginTop: '16px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '14px',
                          padding: '14px 18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(16, 163, 127, 0.15)',
                            border: '1px solid rgba(16, 163, 127, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10a37f',
                            flexShrink: 0,
                          }}>
                            <LayoutDashboard size={20} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.94rem', fontWeight: 600, color: '#ececec' }}>
                                {msg.artifact.title}
                              </span>
                              <span style={{
                                fontSize: '0.68rem',
                                backgroundColor: '#282828',
                                color: '#10a37f',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: 600,
                              }}>
                                Interactive Artifact
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.artifact.subtitle || 'Click to inspect KPIs, completeness audit, and distributions in side panel'}
                            </span>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#10a37f',
                          fontSize: '0.84rem',
                          fontWeight: 500,
                          backgroundColor: 'rgba(16, 163, 127, 0.12)',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          flexShrink: 0,
                        }}>
                          <span>View Artifact</span>
                          <ArrowUpRight size={15} />
                        </div>
                      </div>
                    )}

                    {/* Action Prompt Button (e.g. Prompt to generate dashboard after upload) */}
                    {msg.action_prompt && (
                      <div style={{ marginTop: '14px' }}>
                        <button
                          onClick={() => handleCardClick(msg.action_prompt)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 16px',
                            borderRadius: '10px',
                            backgroundColor: '#1e1e1e',
                            border: '1px solid #10a37f',
                            color: '#10a37f',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 163, 127, 0.15)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.15)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e1e1e')}
                        >
                          <LayoutDashboard size={16} />
                          <span>Generate Executive Dashboard</span>
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Plotly Interactive Visualizer */}
                    {msg.chart_spec && (
                      <div style={{ marginTop: '16px' }}>
                        <ChartRenderer spec={msg.chart_spec} />
                      </div>
                    )}

                    {/* Anomaly Records Table */}
                    {msg.anomalies && msg.anomalies.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '14px',
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <AlertOctagon size={16} />
                          <span>Flagged Statistical Outliers</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #333', color: '#737373', textAlign: 'left' }}>
                                <th style={{ padding: '6px' }}>ROW #</th>
                                <th style={{ padding: '6px' }}>COLUMN</th>
                                <th style={{ padding: '6px' }}>VALUE</th>
                                <th style={{ padding: '6px' }}>METHOD</th>
                                <th style={{ padding: '6px' }}>SCORE</th>
                                <th style={{ padding: '6px' }}>EXPLANATION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {msg.anomalies.map((a, aIdx) => (
                                <tr key={aIdx} style={{ borderBottom: '1px solid #262626' }}>
                                  <td style={{ padding: '6px', color: '#3b82f6' }}>{a.row_index}</td>
                                  <td style={{ padding: '6px', color: '#ececec' }}>{a.column}</td>
                                  <td style={{ padding: '6px', color: '#ef4444', fontWeight: 600 }}>
                                    {typeof a.value === 'number' ? a.value.toLocaleString() : a.value}
                                  </td>
                                  <td style={{ padding: '6px', color: '#737373' }}>{a.method.toUpperCase()}</td>
                                  <td style={{ padding: '6px', color: '#8b5cf6' }}>{a.score}</td>
                                  <td style={{ padding: '6px', color: '#b4b4b4' }}>{a.explanation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Tabular Result View */}
                    {msg.tool_result && msg.tool_result.records && msg.tool_result.records.length > 0 && (
                      <div style={{
                        marginTop: '14px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2f2f2f',
                        borderRadius: '12px',
                        padding: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#737373', marginBottom: '8px' }}>
                          <Table size={14} />
                          <span>Tabular Data ({msg.tool_result.records.length} rows)</span>
                        </div>
                        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', color: '#737373' }}>
                                {Object.keys(msg.tool_result.records[0]).map((k) => (
                                  <th key={k} style={{ padding: '6px 8px' }}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.tool_result.records.map((r, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid #262626' }}>
                                  {Object.values(r).map((val, vIdx) => (
                                    <td key={vIdx} style={{ padding: '6px 8px', color: '#ececec' }}>
                                      {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Code Snippets (DuckDB SQL & Pandas) */}
                    {(msg.generated_sql || msg.generated_pandas_code) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                        {msg.generated_sql && (
                          <div style={{
                            backgroundColor: '#171717',
                            border: '1px solid #2f2f2f',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            fontSize: '0.8rem',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: '#212121',
                              color: '#b4b4b4',
                              fontSize: '0.75rem',
                            }}>
                              <span>sql (DuckDB)</span>
                              <button
                                onClick={() => copyToClipboard(msg.generated_sql, `sql-${idx}`)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#b4b4b4',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {copiedCodeId === `sql-${idx}` ? <Check size={13} color="#10a37f" /> : <Copy size={13} />}
                                <span>{copiedCodeId === `sql-${idx}` ? 'Copied!' : 'Copy code'}</span>
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '12px', color: '#ececec', whiteSpace: 'pre-wrap' }}>
                              {msg.generated_sql}
                            </pre>
                          </div>
                        )}

                        {msg.generated_pandas_code && (
                          <div style={{
                            backgroundColor: '#171717',
                            border: '1px solid #2f2f2f',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            fontSize: '0.8rem',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: '#212121',
                              color: '#b4b4b4',
                              fontSize: '0.75rem',
                            }}>
                              <span>python (pandas)</span>
                              <button
                                onClick={() => copyToClipboard(msg.generated_pandas_code, `pd-${idx}`)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#b4b4b4',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {copiedCodeId === `pd-${idx}` ? <Check size={13} color="#10a37f" /> : <Copy size={13} />}
                                <span>{copiedCodeId === `pd-${idx}` ? 'Copied!' : 'Copy code'}</span>
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '12px', color: '#ececec', whiteSpace: 'pre-wrap' }}>
                              {msg.generated_pandas_code}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ChatGPT Response Action Icons Bar (after streaming finishes) */}
                    {!msg.streaming && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                      <button
                        onClick={() => copyMessage(msg.content, idx)}
                        title="Copy answer"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#737373',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ececec')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
                      >
                        {copiedMsgIdx === idx ? <Check size={15} color="#10a37f" /> : <Copy size={15} />}
                      </button>

                      <button
                        onClick={() => setLikedMap((prev) => ({ ...prev, [idx]: prev[idx] === 'up' ? null : 'up' }))}
                        title="Good response"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: likedMap[idx] === 'up' ? '#10a37f' : '#737373',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ececec')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = likedMap[idx] === 'up' ? '#10a37f' : '#737373')}
                      >
                        <ThumbsUp size={15} />
                      </button>

                      <button
                        onClick={() => setLikedMap((prev) => ({ ...prev, [idx]: prev[idx] === 'down' ? null : 'down' }))}
                        title="Bad response"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: likedMap[idx] === 'down' ? '#ef4444' : '#737373',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ececec')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = likedMap[idx] === 'down' ? '#ef4444' : '#737373')}
                      >
                        <ThumbsDown size={15} />
                      </button>

                      {/* Regenerate (latest finished answer only, like ChatGPT) */}
                      {idx === lastAssistantIdx && !loading && onRegenerate && (
                        <button
                          onClick={onRegenerate}
                          title="Regenerate response"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#737373',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ececec')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Assistant Loading State (only before first streamed token arrives) */}
          {loading && !hasStreamingMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#10a37f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div style={{ color: '#b4b4b4', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-thinking" style={{ color: '#10a37f' }}>
                  Analyzing dataset via DuckDB engine...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Bottom Input Composer (ChatGPT Style) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(33, 33, 33, 0) 0%, #212121 40%)',
        padding: '12px 20px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '768px',
            position: 'relative',
          }}
        >
          {/* Floating Slash Command Popup Menu */}
          {slashMenuOpen && filteredSlashCommands.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '12px',
                backgroundColor: '#212121',
                border: '1px solid #383838',
                borderRadius: '16px',
                boxShadow: '0 18px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
                zIndex: 60,
                maxHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid #2d2d2d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#1a1a1a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={14} color="#60a5fa" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '0.3px' }}>
                    Special Features & Slash Commands
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                  ↑↓ navigate • ↵ or click to run • Esc close
                </span>
              </div>
              <div style={{ overflowY: 'auto', padding: '6px' }}>
                {filteredSlashCommands.map((c, idx) => {
                  const IconComp = c.icon;
                  const isSelected = idx === selectedSlashIdx;
                  return (
                    <div
                      key={c.cmd}
                      onClick={() => handleExecuteSlash(c)}
                      onMouseEnter={() => setSelectedSlashIdx(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2f2f2f' : 'transparent',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#3a3a3a' : '#282828',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: c.badgeColor,
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={16} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                              {c.cmd}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#e0e0e0', fontWeight: 500 }}>
                              {c.label}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#999', lineHeight: 1.3 }}>
                            {c.desc}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: c.badgeBg,
                          color: c.badgeColor,
                          flexShrink: 0,
                        }}
                      >
                        {c.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            borderRadius: '26px',
            padding: attachedFiles.length > 0 ? '10px 14px 8px 14px' : '6px 8px 6px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            gap: '8px',
          }}>
            {/* Attachment Chips Preview above text input (ChatGPT Style) */}
            {attachedFiles.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid #2d2d2d',
              }}>
                {attachedFiles.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#212121',
                      border: '1px solid #383838',
                      borderRadius: '12px',
                      padding: '6px 10px',
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      backgroundColor: 'rgba(16, 163, 127, 0.15)',
                      border: '1px solid rgba(16, 163, 127, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10a37f',
                      flexShrink: 0,
                    }}>
                      <FileSpreadsheet size={15} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#ececec', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#8e8e8e' }}>
                        CSV • {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(f.id)}
                      title="Remove file"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#737373',
                        cursor: 'pointer',
                        padding: '3px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '4px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.backgroundColor = '#383838';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#737373';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Attachment Button for CSV upload directly in chat */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach CSV dataset"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b4b4b4',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#383838')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Slash Command Quick Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setSlashMenuOpen((prev) => !prev);
                  if (!input.startsWith('/')) {
                    setInput('/');
                  }
                }}
                title="Special features & slash commands (/)"
                style={{
                  background: slashMenuOpen ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                  border: 'none',
                  color: slashMenuOpen ? '#60a5fa' : '#b4b4b4',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!slashMenuOpen) e.currentTarget.style.backgroundColor = '#383838';
                }}
                onMouseLeave={(e) => {
                  if (!slashMenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                /
              </button>

              {/* Prompt Input Field */}
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={attachedFiles.length > 0 ? "Ask a question about the attached file(s)..." : `Message Prism or type / for features... (${activeDataset || 'ready'})`}
                disabled={loading}
                style={{
                  flexGrow: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#ececec',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />

              {/* Circular Send / Stop Button (ChatGPT style: square while generating) */}
              {loading ? (
                <button
                  type="button"
                  onClick={() => onStop && onStop()}
                  title="Stop generating"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '1px solid #4d4d4d',
                    backgroundColor: '#212121',
                    color: '#ececec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
              <button
                type="submit"
                disabled={(!input.trim() && attachedFiles.length === 0) || loading}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: (input.trim() || attachedFiles.length > 0) && !loading ? '#fff' : '#383838',
                  color: (input.trim() || attachedFiles.length > 0) && !loading ? '#000' : '#737373',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (input.trim() || attachedFiles.length > 0) && !loading ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowUp size={18} />
              </button>
              )}
            </div>
          </div>
        </form>

        {/* Disclaimer */}
        <div style={{
          marginTop: '8px',
          fontSize: '0.72rem',
          color: '#737373',
          textAlign: 'center',
        }}>
          AI Data Analyst can make mistakes. All calculations are deterministically computed via DuckDB.
        </div>
      </div>
    </div>
  );
}
