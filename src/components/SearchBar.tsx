import React, { useEffect, useRef, useCallback } from 'react'

interface SearchBarProps {
  visible: boolean
  searchText: string
  onSearchTextChange: (text: string) => void
  currentMatch: number    // 当前高亮的匹配索引（从 1 开始）
  totalMatches: number    // 总匹配数
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  visible,
  searchText,
  onSearchTextChange,
  currentMatch,
  totalMatches,
  onPrev,
  onNext,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  // 打开时自动聚焦
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  // 键盘快捷键：Enter 下一个，Shift+Enter 上一个，Esc 关闭
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
    }
  }, [onClose, onPrev, onNext])

  if (!visible) return null

  return (
    <div style={styles.container}>
      <div style={styles.bar}>
        {/* 搜索图标 */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.searchIcon}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* 搜索输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索关键词..."
          style={styles.input}
        />

        {/* 匹配计数 */}
        {searchText.length > 0 && (
          <span style={styles.matchCount}>
            {totalMatches > 0 ? `${currentMatch}/${totalMatches}` : '无结果'}
          </span>
        )}

        {/* 分隔线 */}
        <div style={styles.divider} />

        {/* 上一个 */}
        <button
          style={{
            ...styles.navBtn,
            ...(totalMatches === 0 ? styles.navBtnDisabled : {}),
          }}
          onClick={onPrev}
          disabled={totalMatches === 0}
          title="上一个匹配 (Shift+Enter)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 下一个 */}
        <button
          style={{
            ...styles.navBtn,
            ...(totalMatches === 0 ? styles.navBtnDisabled : {}),
          }}
          onClick={onNext}
          disabled={totalMatches === 0}
          title="下一个匹配 (Enter)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 分隔线 */}
        <div style={styles.divider} />

        {/* 关闭 */}
        <button
          style={styles.closeBtn}
          onClick={onClose}
          title="关闭搜索 (Esc)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 50,
    animation: 'searchBarSlideIn 0.2s ease',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
    minWidth: 320,
  },
  searchIcon: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 14,
    color: 'var(--text-primary)',
    padding: '4px 4px',
    minWidth: 120,
    fontFamily: 'inherit',
  },
  matchCount: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 48,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'var(--border-color)',
    flexShrink: 0,
  },
  navBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  navBtnDisabled: {
    opacity: 0.3,
    cursor: 'default',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
}

export default SearchBar
