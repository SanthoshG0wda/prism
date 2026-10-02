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
} from 'lucide-react';
import ChartRenderer from './ChartRenderer';

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
  onUploadFile,
  model,
  setModel,
  activeArtifact,
  onOpenArtifact,
}) {
  const [input, setInput] = useState('');
  const [openThinking, setOpenThinking] = useState({});
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
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
    { id: 'muse-glimmer', name: 'Muse Glimmer (Agentic 30B)', badge: 'Default' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', badge: 'High Reasoning' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', badge: 'Analytical' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', badge: 'Fast' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      backgroundColor: 'var(--bg-main)',
      overflow: 'hidden',
    }}>
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
              <span>ChatGPT</span>
              <span style={{ color: '#737373', fontSize: '0.82rem', fontWeight: 400 }}>
                • {availableModels.find((m) => m.id === model)?.name.split(' ')[0] || 'Muse Glimmer'}
              </span>
              <ChevronDown size={15} color="#b4b4b4" />
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
              <p style={{ fontSize: '0.95rem', color: '#737373', marginBottom: '36px' }}>
                Upload your CSV dataset and request on-demand analytical dashboards & insights.
              </p>

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
                  <div className="user-bubble">
                    {msg.is_upload && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#10a37f' }}>
                        <FileSpreadsheet size={16} />
                        <span style={{ fontWeight: 600 }}>File Upload</span>
                      </div>
                    )}
                    {msg.content}
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
                    {/* ChatGPT o1/o3-style Thinking Accordion */}
                    {msg.steps_explanation && msg.steps_explanation.length > 0 && (
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
                          <span>Thought for {msg.execution_time_ms ? (msg.execution_time_ms / 1000).toFixed(1) : '1.2'} seconds</span>
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

                    {/* Main Assistant Text */}
                    <div style={{
                      fontSize: '0.96rem',
                      lineHeight: 1.7,
                      color: '#ececec',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
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

                    {/* ChatGPT Response Action Icons Bar */}
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Assistant Loading State */}
          {loading && (
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
                  Analyzing dataset via DuckDB & {model.split('/').pop()}...
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            borderRadius: '26px',
            padding: '6px 8px 6px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            gap: '8px',
          }}>
            {/* Attachment Button for CSV upload directly in chat */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload CSV dataset"
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
              onChange={onUploadFile}
              style={{ display: 'none' }}
            />

            {/* Prompt Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message AI Data Analyst... (${activeDataset || 'ready'})`}
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

            {/* Circular Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: input.trim() && !loading ? '#fff' : '#383838',
                color: input.trim() && !loading ? '#000' : '#737373',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowUp size={18} />
            </button>
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
