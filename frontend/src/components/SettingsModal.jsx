import React from 'react';
import { X, Sparkles, Key, Cpu, Trash2 } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  provider,
  setProvider,
  apiKey,
  setApiKey,
  model,
  setModel,
  llmTest,
  onTestConnection,
  onClearAllChats,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#171717',
        border: '1px solid #333',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#10a37f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <Sparkles size={18} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ececec' }}>Settings</h3>
          </div>
          <button
            onClick={onClose}
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Provider */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b4b4b4', fontSize: '0.85rem', marginBottom: '6px' }}>
              <Cpu size={15} />
              <span>AI Provider</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: '#212121',
                border: '1px solid #383838',
                color: '#ececec',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              <option value="nvidia">NVIDIA NIM (Cloud Hosted)</option>
              <option value="ollama">Local (Ollama / vLLM)</option>
              <option value="openai">OpenAI / Compatible</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b4b4b4', fontSize: '0.85rem', marginBottom: '6px' }}>
              <Sparkles size={15} color="#10a37f" />
              <span>Model</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: '#212121',
                border: '1px solid #383838',
                color: '#ececec',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              <option value="meta/muse-glimmer-30b">Muse Glimmer 30B (Default)</option>
              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
              <option value="nvidia/llama-3.1-nemotron-70b-instruct">nvidia/llama-3.1-nemotron-70b</option>
              <option value="meta/llama-3.1-8b-instruct">meta/llama-3.1-8b-instruct</option>
              <option value="mistralai/mistral-large-2-instruct">mistralai/mistral-large-2</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b4b4b4', fontSize: '0.85rem', marginBottom: '6px' }}>
              <Key size={15} />
              <span>API Key</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nvapi-... (optional, heuristic fallback active without key)"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: '#212121',
                border: '1px solid #383838',
                color: '#ececec',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#737373', display: 'block', marginTop: '4px' }}>
              Get a free 1000-credit key at build.nvidia.com
            </span>
            {/* Connection self-test: validates key + model in seconds */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={onTestConnection}
                disabled={!onTestConnection || (llmTest && llmTest.state === 'testing')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #10a37f',
                  color: '#10a37f',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: !onTestConnection || (llmTest && llmTest.state === 'testing') ? 0.5 : 1,
                }}
              >
                <span>{llmTest && llmTest.state === 'testing' ? 'Testing…' : 'Test connection'}</span>
              </button>
              {llmTest && llmTest.state !== 'idle' && (
                <span style={{
                  fontSize: '0.78rem',
                  color: llmTest.state === 'ok' ? '#10a37f' : llmTest.state === 'error' ? '#ef4444' : '#b4b4b4',
                }}>
                  {llmTest.state === 'ok' ? '✓ ' : llmTest.state === 'error' ? '✗ ' : ''}
                  {llmTest.message}
                </span>
              )}
            </div>
          </div>

          {/* Clear All Chats */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid #282828' }}>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all chat conversations?')) {
                  onClearAllChats();
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} />
              <span>Clear all conversations</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#ececec',
              border: 'none',
              color: '#171717',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
