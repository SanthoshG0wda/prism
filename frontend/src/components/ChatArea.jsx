import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowUp,
  User,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  Award,
  Calendar,
  Code2,
  Copy,
  Check,
  Table,
} from 'lucide-react';
import ChartRenderer from './ChartRenderer';

export default function ChatArea({
  activeDataset,
  messages,
  onSendMessage,
  loading,
}) {
  const [input, setInput] = useState('');
  const [openThinking, setOpenThinking] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

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

  const handlePromptCardClick = (promptText) => {
    if (loading) return;
    onSendMessage(promptText);
  };

  const toggleThinking = (idx) => {
    setOpenThinking((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const starterCards = [
    {
      title: 'Top 5 Customers by Revenue',
      desc: 'Rank key accounts by cumulative volume',
      icon: <Award size={20} color="#fdd663" />,
      query: 'What are the top 5 customers by revenue?',
    },
    {
      title: 'Monthly Sales Trend',
      desc: 'Resample monthly sales & plot line chart',
      icon: <TrendingUp size={20} color="#8ab4f8" />,
      query: 'Show the monthly sales trend chart.',
    },
    {
      title: 'Detect Statistical Outliers',
      desc: 'Scan revenue anomalies using Tukey fences',
      icon: <AlertOctagon size={20} color="#f28b82" />,
      query: 'Detect anomalies in revenue and explain why they were flagged.',
    },
    {
      title: '3-Month Predictive Forecast',
      desc: 'Forecast revenue with 95% confidence intervals',
      icon: <Calendar size={20} color="#c58af9" />,
      query: 'Forecast revenue for next 3 months with confidence intervals.',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Scrollable Conversation View */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '24px 20px 100px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '840px' }}>
          {/* Fresh Conversation Empty State (Gemini Hero) */}
          {messages.length === 0 && (
            <div style={{ paddingTop: '40px', paddingBottom: '30px' }}>
              <h1 className="gemini-gradient-text" style={{ fontSize: '3rem', fontWeight: 600, lineHeight: 1.2, marginBottom: '8px' }}>
                Hello, Analyst
              </h1>
              <p style={{ fontSize: '1.5rem', color: '#5f6368', fontWeight: 400, marginBottom: '36px' }}>
                How can I help you explore <strong style={{ color: '#e3e3e3' }}>{activeDataset || 'your dataset'}</strong> today?
              </p>

              {/* 2x2 Prompt Starter Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '14px',
              }}>
                {starterCards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePromptCardClick(card.query)}
                    className="card-hover"
                    style={{
                      backgroundColor: '#1e1f20',
                      border: '1px solid #313335',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      minHeight: '90px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f3f4', marginBottom: '4px' }}>
                        {card.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#9aa0a6' }}>
                        {card.desc}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#131314', padding: '8px', borderRadius: '12px' }}>
                      {card.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          {messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '24px', width: '100%' }}>
              {msg.role === 'user' ? (
                /* User Message Bubble */
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    backgroundColor: '#282a2c',
                    color: '#f1f3f4',
                    borderRadius: '20px 20px 4px 20px',
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    maxWidth: '80%',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3c4043',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <User size={18} color="#fff" />
                  </div>
                </div>
              ) : (
                /* Assistant Message */
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4285f4, #9b72cb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '4px',
                  }}>
                    <Sparkles size={17} color="#fff" />
                  </div>

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    {/* Gemini Thinking Accordion */}
                    {msg.steps_explanation && msg.steps_explanation.length > 0 && (
                      <div style={{
                        backgroundColor: '#1a1a1c',
                        border: '1px solid #282a2c',
                        borderRadius: '12px',
                        marginBottom: '14px',
                        overflow: 'hidden',
                      }}>
                        <div
                          onClick={() => toggleThinking(idx)}
                          style={{
                            padding: '8px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: '#9aa0a6',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                          }}
                        >
                          <Sparkles size={14} color="#8ab4f8" />
                          <span>Thinking Process ({msg.steps_explanation.length} steps • {msg.execution_time_ms ? msg.execution_time_ms.toFixed(1) : 0}ms)</span>
                          {openThinking[idx] ? <ChevronDown size={14} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                        </div>

                        {openThinking[idx] && (
                          <div style={{ padding: '10px 14px', borderTop: '1px solid #282a2c', fontSize: '0.8rem', color: '#c4c7c5' }}>
                            {msg.steps_explanation.map((step, sIdx) => (
                              <div key={sIdx} style={{ padding: '3px 0', fontFamily: 'monospace', color: '#9aa0a6' }}>
                                • {step}
                              </div>
                            ))}
                            {msg.tool_used && (
                              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#8ab4f8' }}>
                                🔧 Deterministic Engine: <code>{msg.tool_used}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Text Content */}
                    <div style={{
                      fontSize: '0.98rem',
                      lineHeight: 1.65,
                      color: '#e3e3e3',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>

                    {/* Interactive Plotly Chart */}
                    {msg.chart_spec && (
                      <ChartRenderer spec={msg.chart_spec} />
                    )}

                    {/* Anomaly Records */}
                    {msg.anomalies && msg.anomalies.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        backgroundColor: '#1e1f20',
                        border: '1px solid #3c4043',
                        borderRadius: '12px',
                        padding: '14px',
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f28b82', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <AlertOctagon size={16} />
                          <span>Flagged Statistical Outliers</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #3c4043', color: '#9aa0a6', textAlign: 'left' }}>
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
                                <tr key={aIdx} style={{ borderBottom: '1px solid #282a2c' }}>
                                  <td style={{ padding: '6px', color: '#8ab4f8' }}>{a.row_index}</td>
                                  <td style={{ padding: '6px', color: '#f1f3f4' }}>{a.column}</td>
                                  <td style={{ padding: '6px', color: '#f28b82', fontWeight: 600 }}>{typeof a.value === 'number' ? a.value.toLocaleString() : a.value}</td>
                                  <td style={{ padding: '6px', color: '#9aa0a6' }}>{a.method.toUpperCase()}</td>
                                  <td style={{ padding: '6px', color: '#c58af9' }}>{a.score}</td>
                                  <td style={{ padding: '6px', color: '#c4c7c5' }}>{a.explanation}</td>
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
                        backgroundColor: '#1b1c1d',
                        border: '1px solid #2d2f31',
                        borderRadius: '12px',
                        padding: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#9aa0a6', marginBottom: '8px' }}>
                          <Table size={14} />
                          <span>Tabular Result ({msg.tool_result.records.length} records)</span>
                        </div>
                        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #3c4043', textAlign: 'left', color: '#9aa0a6' }}>
                                {Object.keys(msg.tool_result.records[0]).map((k) => (
                                  <th key={k} style={{ padding: '6px 8px' }}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.tool_result.records.map((r, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid #282a2c' }}>
                                  {Object.values(r).map((val, vIdx) => (
                                    <td key={vIdx} style={{ padding: '6px 8px', color: '#e3e3e3' }}>
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

                    {/* Code Drawers (SQL & Pandas) */}
                    {(msg.generated_sql || msg.generated_pandas_code) && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                        {msg.generated_sql && (
                          <div style={{
                            flex: 1,
                            backgroundColor: '#1b1c1d',
                            border: '1px solid #2d2f31',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '0.78rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', color: '#8ab4f8' }}>
                              <span>DuckDB SQL</span>
                              <button
                                onClick={() => copyToClipboard(msg.generated_sql, `sql-${idx}`)}
                                style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer' }}
                              >
                                {copiedIndex === `sql-${idx}` ? <Check size={14} color="#81c995" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <pre style={{ margin: 0, color: '#f1f3f4', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                              {msg.generated_sql}
                            </pre>
                          </div>
                        )}

                        {msg.generated_pandas_code && (
                          <div style={{
                            flex: 1,
                            backgroundColor: '#1b1c1d',
                            border: '1px solid #2d2f31',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '0.78rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', color: '#c58af9' }}>
                              <span>Equivalent Pandas</span>
                              <button
                                onClick={() => copyToClipboard(msg.generated_pandas_code, `pd-${idx}`)}
                                style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer' }}
                              >
                                {copiedIndex === `pd-${idx}` ? <Check size={14} color="#81c995" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <pre style={{ margin: 0, color: '#f1f3f4', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                              {msg.generated_pandas_code}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4285f4, #9b72cb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sparkles size={17} color="#fff" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9aa0a6', fontSize: '0.9rem' }}>
                <span className="gemini-gradient-text" style={{ fontWeight: 500 }}>
                  Analyzing dataset with deterministic tools...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Capsule Chat Input Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(19, 19, 20, 0) 0%, #131314 50%)',
        padding: '16px 20px 24px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '840px',
            position: 'relative',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e1f20',
            border: '1px solid #3c4043',
            borderRadius: '28px',
            padding: '6px 8px 6px 20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your data, metrics, or visualizations..."
              disabled={loading}
              style={{
                flexGrow: 1,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#f1f3f4',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: input.trim() && !loading ? '#f1f3f4' : '#2d2f31',
                color: input.trim() && !loading ? '#131314' : '#5f6368',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
