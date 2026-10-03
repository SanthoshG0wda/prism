import React, { useState } from 'react';
import {
  LayoutDashboard,
  Maximize2,
  Minimize2,
  X,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import DashboardView from './DashboardView';
import { getApiUrl } from '../utils/api';

export default function ArtifactPanel({
  artifact,
  isOpen,
  onClose,
  isMaximized,
  onToggleMaximize,
}) {
  if (!isOpen || !artifact) return null;

  const handleExport = () => {
    window.open(getApiUrl('/api/export-report'), '_blank');
  };

  return (
    <div
      style={{
        width: isMaximized ? '100%' : '52%',
        height: '100%',
        backgroundColor: '#171717',
        borderLeft: '1px solid #2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Claude-style Artifact Header */}
      <header
        style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          borderBottom: '1px solid #2d2d2d',
          backgroundColor: '#1f1f1f',
          flexShrink: 0,
        }}
      >
        {/* Left: Artifact Icon, Title, and Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#10a37f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <LayoutDashboard size={16} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: '#ececec',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {artifact.title || 'Executive Dashboard'}
              </span>

              <span
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: '#2b2b2b',
                  color: '#10a37f',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Artifact
              </span>
            </div>
            {artifact.subtitle && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#737373',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {artifact.subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Export, Maximize, Close) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleExport}
            title="Download Executive HTML Report"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b4b4b4',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Download size={17} />
          </button>

          <button
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore split view' : 'Maximize artifact'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b4b4b4',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f2f2f')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          <button
            onClick={onClose}
            title="Close artifact panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b4b4b4',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Artifact Scrollable Content */}
      <div
        className="sidebar-scroll"
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          backgroundColor: '#171717',
        }}
      >
        <DashboardView
          activeDataset={artifact.table_name}
          initialData={artifact.data}
        />
      </div>
    </div>
  );
}
