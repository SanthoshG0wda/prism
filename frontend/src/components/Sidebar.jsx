import React, { useState } from 'react';
import {
  Sparkles,
  Database,
  Upload,
  Settings,
  Download,
  Trash2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';

export default function Sidebar({
  catalog,
  activeDataset,
  onSelectDataset,
  onUploadSuccess,
  onLoadSamples,
  onClearChat,
  provider,
  setProvider,
  apiKey,
  setApiKey,
  model,
  setModel,
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeMeta = catalog?.tables?.find((t) => t.name === activeDataset);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
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
        onUploadSuccess();
      } else {
        alert('Upload failed: ' + (await res.text()));
      }
    } catch (err) {
      alert('Error uploading file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    window.open('/api/export-report', '_blank');
  };

  return (
    <aside style={{
      width: '290px',
      backgroundColor: '#1e1f20',
      borderRight: '1px solid #282a2c',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #4285f4, #9b72cb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}>
          <Sparkles size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f3f4' }}>AI Data Analyst</h2>
          <div style={{ fontSize: '0.72rem', color: '#9aa0a6' }}>Digital Back Office</div>
        </div>
      </div>

      {/* Model Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#131314',
        border: '1px solid #3c4043',
        padding: '5px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: '#8ab4f8',
        marginBottom: '16px',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#81c995' }} />
        <span>NVIDIA NIM • Llama 3.3 70B</span>
      </div>

      {/* Configuration Accordion */}
      <div style={{
        backgroundColor: '#131314',
        border: '1px solid #282a2c',
        borderRadius: '12px',
        marginBottom: '16px',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setShowConfig(!showConfig)}
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: '#c4c7c5',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={15} color="#9aa0a6" />
            <span>AI Provider & Model</span>
          </div>
          {showConfig ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>

        {showConfig && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid #212224', fontSize: '0.8rem' }}>
            <label style={{ display: 'block', color: '#9aa0a6', marginBottom: '4px' }}>Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: '#1e1f20',
                border: '1px solid #3c4043',
                color: '#fff',
                marginBottom: '10px',
                fontSize: '0.8rem',
              }}
            >
              <option value="nvidia">NVIDIA NIM (Recommended)</option>
              <option value="openai">OpenAI / Compatible</option>
              <option value="ollama">Local (Ollama)</option>
            </select>

            <label style={{ display: 'block', color: '#9aa0a6', marginBottom: '4px' }}>Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: '#1e1f20',
                border: '1px solid #3c4043',
                color: '#fff',
                marginBottom: '10px',
                fontSize: '0.8rem',
              }}
            >
              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
              <option value="nvidia/llama-3.1-nemotron-70b-instruct">nvidia/llama-3.1-nemotron-70b</option>
              <option value="meta/llama-3.1-8b-instruct">meta/llama-3.1-8b-instruct</option>
              <option value="mistralai/mistral-large-2-instruct">mistralai/mistral-large-2</option>
            </select>

            <label style={{ display: 'block', color: '#9aa0a6', marginBottom: '4px' }}>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nvapi-... (optional)"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: '#1e1f20',
                border: '1px solid #3c4043',
                color: '#fff',
                fontSize: '0.8rem',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#5f6368', display: 'block', marginTop: '4px' }}>
              Free key: build.nvidia.com
            </span>
          </div>
        )}
      </div>

      {/* Dataset Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Data Catalog
        </div>

        {/* Upload Button */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '9px',
          borderRadius: '10px',
          border: '1px dashed #3c4043',
          backgroundColor: '#17181a',
          color: '#8ab4f8',
          fontSize: '0.82rem',
          cursor: 'pointer',
          marginBottom: '8px',
          transition: 'all 0.2s ease',
        }}>
          <Upload size={15} />
          <span>{uploading ? 'Uploading...' : 'Upload CSV Files'}</span>
          <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>

        {/* Load Samples */}
        <button
          onClick={onLoadSamples}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            borderRadius: '10px',
            border: '1px solid #2d2f31',
            backgroundColor: '#1e1f20',
            color: '#c4c7c5',
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginBottom: '14px',
          }}
        >
          <Database size={14} color="#8ab4f8" />
          <span>Load Sample Datasets</span>
        </button>

        {/* Active Dataset Picker */}
        <label style={{ display: 'block', color: '#9aa0a6', fontSize: '0.75rem', marginBottom: '4px' }}>
          ACTIVE DATASET
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {catalog?.tables?.map((table) => {
            const isActive = table.name === activeDataset;
            return (
              <div
                key={table.name}
                onClick={() => onSelectDataset(table.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? '#282a2c' : '#17181a',
                  border: isActive ? '1px solid #8ab4f8' : '1px solid #282a2c',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={15} color={isActive ? '#8ab4f8' : '#9aa0a6'} />
                  <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, color: '#f1f3f4' }}>
                    {table.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#9aa0a6', backgroundColor: '#1e1f20', padding: '2px 6px', borderRadius: '6px' }}>
                  {table.row_count} rows
                </span>
              </div>
            );
          })}
        </div>

        {/* Active Schema Summary Button */}
        {activeMeta && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => setShowSchema(!showSchema)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#9aa0a6',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <span>{activeMeta.columns.length} columns • {(activeMeta.memory_bytes / 1024).toFixed(1)} KB</span>
              <Info size={13} />
            </button>

            {showSchema && (
              <div style={{
                maxHeight: '140px',
                overflowY: 'auto',
                backgroundColor: '#131314',
                padding: '8px',
                borderRadius: '8px',
                marginTop: '4px',
                fontSize: '0.72rem',
                border: '1px solid #282a2c',
              }}>
                {activeMeta.columns.map((c) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #1e1f20' }}>
                    <code style={{ color: '#8ab4f8' }}>{c.name}</code>
                    <span style={{ color: '#5f6368' }}>{c.dtype}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flexGrow: 1 }} />

      {/* Footer Actions */}
      <div style={{ borderTop: '1px solid #282a2c', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            borderRadius: '10px',
            border: '1px solid #282a2c',
            backgroundColor: '#17181a',
            color: '#c4c7c5',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <Download size={14} color="#8ab4f8" />
          <span>Export HTML Report</span>
        </button>

        <button
          onClick={onClearChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9aa0a6',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
          <span>Clear Conversation</span>
        </button>
      </div>
    </aside>
  );
}
