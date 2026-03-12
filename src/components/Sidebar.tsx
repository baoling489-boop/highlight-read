import React, { useState } from 'react'
import { HighlightWord, Bookmark, HIGHLIGHT_COLORS } from '../nlp'

interface TocItem {
  id: string
  href: string
  label: string
  subitems?: TocItem[]
  level?: number
}

interface SidebarProps {
  toc: TocItem[]
  currentChapter: string
  onNavigate: (href: string) => void
  bookTitle: string
  onClose: () => void
  highlightWords: HighlightWord[]
  onRemoveHighlight: (text: string) => void
  onChangeHighlightColor: (text: string, newColor: string) => void
  onExportHighlights: () => void
  onImportHighlights: () => void
  // 书签
  bookmarks: Bookmark[]
  onRemoveBookmark: (id: string) => void
  onNavigateBookmark: (cfi: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  toc,
  currentChapter,
  onNavigate,
  bookTitle,
  onClose,
  highlightWords,
  onRemoveHighlight,
  onChangeHighlightColor,
  onExportHighlights,
  onImportHighlights,
  bookmarks,
  onRemoveBookmark,
  onNavigateBookmark,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'highlights' | 'bookmarks'>('toc')
  const [editingWord, setEditingWord] = useState<string | null>(null)

  return (
    <div style={styles.sidebar}>
      {/* 头部 */}
      <div style={styles.header}>
        <h2 style={styles.bookTitle}>{bookTitle}</h2>
        <button style={styles.closeBtn} onClick={onClose} title="关闭侧边栏">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab 切换 */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'toc' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('toc')}
        >
          📑 目录
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'bookmarks' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('bookmarks')}
        >
          🔖 书签 ({bookmarks.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'highlights' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('highlights')}
        >
          🎨 高亮 ({highlightWords.length})
        </button>
      </div>

      {/* Tab 内容 */}
      <div style={styles.content}>
        {activeTab === 'toc' ? (
          <div style={styles.tocList}>
            {toc.map((item, index) => (
              <TocEntry
                key={item.id || index}
                item={item}
                currentChapter={currentChapter}
                onNavigate={onNavigate}
                level={0}
              />
            ))}
            {toc.length === 0 && (
              <p style={styles.emptyHint}>暂无目录信息</p>
            )}
          </div>
        ) : activeTab === 'bookmarks' ? (
          <div style={styles.highlightList}>
            {bookmarks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🔖</div>
                <p style={styles.emptyTitle}>还没有书签</p>
                <p style={styles.emptyDesc}>
                  点击工具栏的书签图标<br />
                  即可在当前位置添加书签
                </p>
              </div>
            ) : (
              [...bookmarks].sort((a, b) => b.createdAt - a.createdAt).map((bm) => (
                <div
                  key={bm.id}
                  style={styles.bookmarkItem}
                  onClick={() => onNavigateBookmark(bm.cfi)}
                >
                  <div style={styles.bookmarkContent}>
                    <div style={styles.bookmarkChapter}>
                      <span style={styles.bookmarkIcon}>🔖</span>
                      {bm.chapter || '未知章节'}
                    </div>
                    <div style={styles.bookmarkText}>{bm.text}</div>
                    <div style={styles.bookmarkMeta}>
                      <span>{bm.progress.toFixed(1)}%</span>
                      <span>·</span>
                      <span>{new Date(bm.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <button
                    style={styles.bookmarkDeleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveBookmark(bm.id)
                    }}
                    title="删除书签"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={styles.highlightList}>
            {highlightWords.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎨</div>
                <p style={styles.emptyTitle}>还没有高亮词</p>
                <p style={styles.emptyDesc}>
                  在阅读时选中任意文字，<br />
                  选择颜色即可添加高亮
                </p>
              </div>
            ) : (
              highlightWords.map((word) => {
                const colorInfo = HIGHLIGHT_COLORS[word.color]
                return (
                  <div key={word.text} style={styles.highlightItem}>
                    <div style={styles.highlightLeft}>
                      <span
                        style={{
                          ...styles.colorDot,
                          backgroundColor: colorInfo?.border || '#6366f1',
                        }}
                      />
                      <span style={styles.highlightText}>{word.text}</span>
                    </div>
                    <div style={styles.highlightActions}>
                      {editingWord === word.text ? (
                        <div style={styles.colorPalette}>
                          {Object.entries(HIGHLIGHT_COLORS).map(([key, color]) => (
                            <button
                              key={key}
                              style={{
                                ...styles.paletteBtn,
                                backgroundColor: color.border,
                                ...(word.color === key ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${color.border}` } : {}),
                              }}
                              onClick={() => {
                                onChangeHighlightColor(word.text, key)
                                setEditingWord(null)
                              }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <button
                            style={styles.actionBtn}
                            onClick={() => setEditingWord(word.text)}
                            title="更换颜色"
                          >
                            🎨
                          </button>
                          <button
                            style={styles.actionBtn}
                            onClick={() => onRemoveHighlight(word.text)}
                            title="删除高亮"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* 导出 / 导入按钮 */}
            <div style={styles.ioButtons}>
              <button
                style={styles.ioBtn}
                onClick={onExportHighlights}
                disabled={highlightWords.length === 0}
                title="导出高亮标记为 JSON 文件"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4 }}>
                  <path d="M8 2v8M8 10l-3-3M8 10l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                导出
              </button>
              <button
                style={styles.ioBtn}
                onClick={onImportHighlights}
                title="从 JSON 文件导入高亮标记"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4 }}>
                  <path d="M8 10V2M8 2l-3 3M8 2l3 3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                导入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 目录条目子组件
const TocEntry: React.FC<{
  item: TocItem
  currentChapter: string
  onNavigate: (href: string) => void
  level: number
}> = ({ item, currentChapter, onNavigate, level }) => {
  const isActive = currentChapter === item.href
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.subitems && item.subitems.length > 0

  return (
    <div>
      <div
        style={{
          ...styles.tocItem,
          paddingLeft: 16 + level * 16,
          ...(isActive ? styles.tocItemActive : {}),
        }}
        onClick={() => onNavigate(item.href)}
      >
        {hasChildren && (
          <span
            style={styles.expandIcon}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        <span style={styles.tocLabel}>{item.label}</span>
      </div>
      {hasChildren && expanded && item.subitems!.map((sub, idx) => (
        <TocEntry
          key={sub.id || idx}
          item={sub}
          currentChapter={currentChapter}
          onNavigate={onNavigate}
          level={level + 1}
        />
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 300,
    height: '100%',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  header: {
    padding: '20px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    padding: '8px 12px 0',
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--accent-color)',
    fontWeight: 600,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  tocList: {
    padding: '4px 0',
  },
  tocItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 14,
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent',
  },
  tocItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    color: 'var(--accent-color)',
    fontWeight: 600,
    borderLeftColor: 'var(--accent-color)',
  },
  expandIcon: {
    marginRight: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  tocLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // 高亮词列表
  highlightList: {
    padding: '4px 12px',
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'var(--bg-secondary)',
    transition: 'all 0.2s ease',
  },
  highlightLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
  },
  highlightText: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  highlightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
    borderRadius: 4,
    transition: 'all 0.2s ease',
    opacity: 0.6,
  },
  colorPalette: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  paletteBtn: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  // 空状态
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },
  emptyHint: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '0 16px',
  },
  ioButtons: {
    display: 'flex',
    gap: 8,
    padding: '12px 0 4px',
    marginTop: 8,
    borderTop: '1px solid var(--border-color)',
  },
  ioBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  // 书签条目
  bookmarkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: 8,
  },
  bookmarkContent: {
    flex: 1,
    minWidth: 0,
  },
  bookmarkChapter: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bookmarkIcon: {
    fontSize: 12,
    flexShrink: 0,
  },
  bookmarkText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: 4,
  },
  bookmarkMeta: {
    fontSize: 11,
    color: 'var(--text-muted)',
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  bookmarkDeleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 6px',
    borderRadius: 4,
    color: 'var(--text-muted)',
    transition: 'all 0.2s ease',
    opacity: 0.5,
    flexShrink: 0,
  },
}

export default Sidebar
