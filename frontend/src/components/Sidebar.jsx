import React, { useState } from 'react';
import {
  MessageSquare,
  SquarePen,
  PanelLeftClose,
  Search,
  Trash2,
  Settings,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onToggleSidebar,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
}) {
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleChats = searchQuery.trim()
    ? chats.filter((c) => (c.title || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : chats;

  // Group chats by date: Today, Yesterday, Previous 7 Days, Older
  const groupChats = () => {    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    visibleChats.forEach((chat) => {      const chatTime = new Date(chat.createdAt || Date.now()).getTime();
      if (chatTime >= today) {
        groups.Today.push(chat);
      } else if (chatTime >= yesterday) {
        groups.Yesterday.push(chat);
      } else if (chatTime >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    return groups;
  };

  const chatGroups = groupChats();

  if (!isOpen) return null;

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px 10px',
        overflowY: 'auto',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Top Header: Sidebar Toggle & New Chat Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
        <button
          onClick={onToggleSidebar}
          title="Close sidebar"
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
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <PanelLeftClose size={20} />
        </button>

        <button
          onClick={onNewChat}
          title="New chat"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ececec',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <SquarePen size={20} />
        </button>
      </div>

      {/* New Chat Primary Button */}
      <button
        onClick={onNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          backgroundColor: 'transparent',
          border: '1px solid var(--border-subtle)',
          color: '#ececec',
          fontSize: '0.88rem',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: '16px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Sparkles size={16} color="#10a37f" />
        <span>New chat</span>
      </button>

      {/* Search chats (ChatGPT style) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '10px',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-subtle)',
        marginBottom: '12px',
      }}>
        <Search size={15} color="#737373" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats"
          style={{
            flexGrow: 1,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#ececec',
            fontSize: '0.85rem',
            outline: 'none',
            minWidth: 0,
          }}
        />
      </div>

      {/* Recent Chats Section */}
      <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '16px' }}>
        {Object.entries(chatGroups).map(([groupTitle, groupItems]) => {
          if (groupItems.length === 0) return null;
          return (
            <div key={groupTitle} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '4px 10px 6px 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {groupTitle}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {groupItems.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isHovered = hoveredChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      onMouseEnter={() => setHoveredChatId(chat.id)}
                      onMouseLeave={() => setHoveredChatId(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? 'var(--bg-sidebar-active)' : isHovered ? 'var(--bg-sidebar-hover)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.86rem',
                        color: isActive ? '#fff' : '#ececec',
                        transition: 'background-color 0.1s ease',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flexGrow: 1 }}>
                        <MessageSquare size={16} color={isActive ? '#10a37f' : '#b4b4b4'} style={{ flexShrink: 0 }} />
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: isActive ? 500 : 400,
                        }}>
                          {chat.title || 'New conversation'}
                        </span>
                      </div>

                      {/* Delete Action Button (visible when active or hovered) */}
                      {(isActive || isHovered) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          title="Delete chat"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#737373',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#737373';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {visibleChats.length === 0 && (
          <div style={{ padding: '16px 10px', color: '#737373', fontSize: '0.82rem', textAlign: 'center' }}>
            {searchQuery ? 'No chats match your search.' : 'No recent conversations yet.'}
          </div>
        )}
      </div>

      {/* Bottom User Profile & Settings Footer */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '4px',
        paddingRight: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#10a37f',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#ececec' }}>Prism</div>
            <div style={{ fontSize: '0.72rem', color: '#10a37f' }}>Deterministic engine</div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          title="Settings"
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
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}
