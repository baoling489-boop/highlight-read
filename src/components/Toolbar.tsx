import React, { useState, useEffect, useRef, useCallback } from 'react'

export interface ADHDOptions {
  enabled: boolean
  sentenceBold: boolean    // 句首加粗+句尾灰色
  lineHighlight: boolean   // 聚焦行高亮
  letterSpacing: boolean   // 字间距增强
  lineSpacingEnhance: boolean // 行间距增强
}

interface ToolbarProps {
  onToggleSidebar: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onToggleTheme: () => void
  isDarkMode: boolean
  currentChapterTitle: string
  progress: number // 0-100
  // 字号
  fontSize: number
  onFontSizeChange: (size: number) => void
  // ADHD
  adhdOptions: ADHDOptions
  onToggleADHD: () => void
  onToggleADHDOption: (key: keyof Omit<ADHDOptions, 'enabled'>) => void
  // 计时器
  sessionSeconds: number
  totalSeconds: number
  // 换书
  onBack: () => void
  // 书签
  isBookmarked: boolean
  onToggleBookmark: () => void
}

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const Toolbar: React.FC<ToolbarProps> = ({
  onToggleSidebar,
  onPrevPage,
  onNextPage,
  onToggleTheme,
  isDarkMode,
  currentChapterTitle,
  progress,
  fontSize,
  onFontSizeChange,
  adhdOptions,
  onToggleADHD,
  onToggleADHDOption,
  sessionSeconds,
  totalSeconds,
  onBack,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [showADHDPanel, setShowADHDPanel] = useState(false)
  const [showReadingPanel, setShowReadingPanel] = useState(false)
  const [isToolbarHidden, setIsToolbarHidden] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // 重置自动隐藏计时器
  const resetHideTimer = useCallback(() => {
    setIsToolbarHidden(false)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    // 面板展开时不自动隐藏
    if (showADHDPanel || showReadingPanel) return
    hideTimerRef.current = setTimeout(() => {
      setIsToolbarHidden(true)
    }, 3000)
  }, [showADHDPanel, showReadingPanel])

  // 监听全局鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 鼠标在顶部 60px 范围内或 hover 在工具栏上时显示
      if (e.clientY <= 60) {
        setIsToolbarHidden(false)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        return
      }
      resetHideTimer()
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    // 初始启动计时器
    resetHideTimer()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [resetHideTimer])

  // 面板打开时暂停自动隐藏
  useEffect(() => {
    if (showADHDPanel || showReadingPanel) {
      setIsToolbarHidden(false)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    } else {
      resetHideTimer()
    }
  }, [showADHDPanel, showReadingPanel, resetHideTimer])

  return (
    <div
      ref={toolbarRef}
      style={{
        ...styles.toolbar,
        transform: isToolbarHidden ? 'translateY(-100%)' : 'translateY(0)',
        opacity: isToolbarHidden ? 0 : 1,
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease',
      }}
      onMouseEnter={() => {
        setIsToolbarHidden(false)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      }}
      onMouseLeave={() => {
        resetHideTimer()
      }}
    >
      {/* 左侧 */}
      <div style={styles.left}>
        <button style={styles.backBtn} onClick={onBack} title="换书">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          换书
        </button>
        <div style={styles.divider} />
        <button style={styles.iconBtn} onClick={onToggleSidebar} title="切换目录">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          style={{
            ...styles.bookmarkBtn,
            ...(isBookmarked ? styles.bookmarkBtnActive : {}),
          }}
          onClick={onToggleBookmark}
          title={isBookmarked ? '移除书签' : '添加书签'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill={isBookmarked ? '#ef4444' : 'none'}>
            <path d="M4 2h8a1 1 0 011 1v11.5a.5.5 0 01-.77.42L8 12.5l-4.23 2.42A.5.5 0 013 14.5V3a1 1 0 011-1z" stroke={isBookmarked ? '#ef4444' : 'currentColor'} strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>
        <span style={styles.chapterTitle}>{currentChapterTitle}</span>
      </div>

      {/* 中间 */}
      <div style={styles.center}>
        <button style={styles.navBtn} onClick={onPrevPage} title="上一章">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <span style={styles.progressText}>{progress.toFixed(0)}%</span>
        </div>

        <button style={styles.navBtn} onClick={onNextPage} title="下一章">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* 右侧 */}
      <div style={styles.right}>
        {/* 计时器 */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              ...styles.timerBtn,
              ...(showReadingPanel ? { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: '#6366f1', color: '#6366f1' } : {}),
            }}
            onClick={() => setShowReadingPanel(!showReadingPanel)}
            title="阅读计时"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5.5V9L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{formatTime(sessionSeconds)}</span>
          </button>

          {/* 计时器详情面板 */}
          {showReadingPanel && (
            <>
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setShowReadingPanel(false)}
              />
              <div style={styles.dropdownPanel}>
                <div style={styles.panelTitle}>📖 阅读时间</div>
                <div style={styles.timerRow}>
                  <span style={styles.timerLabel}>本次阅读</span>
                  <span style={styles.timerValue}>{formatTime(sessionSeconds)}</span>
                </div>
                <div style={styles.timerRow}>
                  <span style={styles.timerLabel}>累计阅读</span>
                  <span style={styles.timerValue}>{formatTime(totalSeconds)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.divider} />

        {/* 可读性调节按钮组 */}
        {/* 字号 */}
        <button
          style={styles.iconBtn}
          onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
          title="缩小字号"
        >
          A<span style={{ fontSize: 10 }}>-</span>
        </button>
        <span style={styles.adjustLabel}>{fontSize}</span>
        <button
          style={styles.iconBtn}
          onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
          title="放大字号"
        >
          A<span style={{ fontSize: 10 }}>+</span>
        </button>

        <div style={styles.divider} />

        {/* ADHD 模式 */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              style={{
                ...styles.adhdBtn,
                ...(adhdOptions.enabled ? styles.adhdBtnActive : {}),
              }}
              onClick={onToggleADHD}
              title={adhdOptions.enabled ? '关闭 ADHD 模式' : '开启 ADHD 模式'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2C4.7 2 2 4.7 2 8s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10.5c-2.5 0-4.5-2-4.5-4.5S5.5 3.5 8 3.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5z"
                  fill={adhdOptions.enabled ? '#6366f1' : 'currentColor'}
                />
                <circle cx="8" cy="8" r="2" fill={adhdOptions.enabled ? '#6366f1' : 'currentColor'} />
              </svg>
              <span style={styles.adhdLabel}>ADHD</span>
            </button>

            {/* 设置按钮 */}
            <button
              style={{
                ...styles.settingsBtn,
                ...(showADHDPanel ? { color: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.08)' } : {}),
              }}
              onClick={() => setShowADHDPanel(!showADHDPanel)}
              title="ADHD 子选项"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M13.3 10.2l-.6-1a5.5 5.5 0 000-2.4l.6-1a.5.5 0 00-.2-.6l-1-.6a.5.5 0 00-.6.1 5.3 5.3 0 01-2 1.2.5.5 0 00-.3.5v1.2a.5.5 0 00.3.5 5.3 5.3 0 012 1.2.5.5 0 00.6.1l1-.6a.5.5 0 00.2-.6z" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              </svg>
            </button>
          </div>

          {/* ADHD 子选项面板 */}
          {showADHDPanel && (
            <>
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setShowADHDPanel(false)}
              />
              <div style={styles.dropdownPanel}>
                <div style={styles.panelTitle}>🧠 ADHD 模式选项</div>
                {([
                  { key: 'sentenceBold' as const, label: '句首/句尾强化', desc: '句首渐变加粗，句尾灰色渐淡' },
                  { key: 'lineHighlight' as const, label: '聚焦行高亮', desc: '鼠标所在行高亮，上下区域微暗' },
                  { key: 'letterSpacing' as const, label: '字间距增强', desc: '增加字间距提升辨识度' },
                  { key: 'lineSpacingEnhance' as const, label: '行间距增强', desc: '加大行间距提升阅读舒适度' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} style={styles.optionRow}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.optionLabel}>{label}</div>
                      <div style={styles.optionDesc}>{desc}</div>
                    </div>
                    <button
                      style={{
                        ...styles.toggleSwitch,
                        ...(adhdOptions[key] ? styles.toggleSwitchOn : {}),
                      }}
                      onClick={() => onToggleADHDOption(key)}
                    >
                      <div
                        style={{
                          ...styles.toggleKnob,
                          ...(adhdOptions[key] ? styles.toggleKnobOn : {}),
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={styles.divider} />

        {/* 主题切换 */}
        <button style={styles.iconBtn} onClick={onToggleTheme} title="切换主题">
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 2V4M9 14V16M2 9H4M14 9H16M4 4L5.5 5.5M12.5 12.5L14 14M14 4L12.5 5.5M5.5 12.5L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 10.5A6.5 6.5 0 017.5 3 6 6 0 1015 10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    flexShrink: 0,
    zIndex: 10,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '5px 6px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  backBtn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px 10px 4px 6px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const,
  },
  bookmarkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px 5px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  bookmarkBtnActive: {
    color: '#ef4444',
  },
  navBtn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'var(--border-color)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    minWidth: 36,
    textAlign: 'right',
  },
  adjustLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    minWidth: 22,
    textAlign: 'center',
    fontWeight: 500,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'var(--border-color)',
    margin: '0 3px',
    flexShrink: 0,
  },
  // 计时器按钮
  timerBtn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px 8px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const,
  },
  // ADHD 按钮
  adhdBtn: {
    background: 'none',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px 10px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  adhdBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366f1',
    color: '#6366f1',
  },
  adhdLabel: {
    letterSpacing: '0.5px',
  },
  // 设置按钮（ADHD 旁边的齿轮）
  settingsBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px 5px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  // 下拉面板
  dropdownPanel: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: '12px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
    minWidth: 240,
    zIndex: 100,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-color)',
  },
  // 计时器行
  timerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  timerLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  timerValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  // ADHD 子选项行
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  optionDesc: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  // Toggle switch
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    backgroundColor: 'var(--border-color)',
    cursor: 'pointer',
    position: 'relative',
    padding: 2,
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  toggleSwitchOn: {
    backgroundColor: '#6366f1',
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'transform 0.2s ease',
    transform: 'translateX(0)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  toggleKnobOn: {
    transform: 'translateX(16px)',
  },
}

export default Toolbar
