import React, { useEffect, useRef, useState, useCallback } from 'react'
import ePub from 'epubjs'
import Toolbar, { ADHDOptions } from './Toolbar'
import Sidebar from './Sidebar'
import {
  HighlightWord,
  HIGHLIGHT_COLORS,
  generateHighlightStyles,
  generateADHDStyles,
  applyCustomHighlights,
  applyADHDSentenceBold,
  applyADHDParagraphEnhance,
  clearAllEffects,
  loadHighlightWords,
  saveHighlightWords,
  exportHighlightWords,
  importHighlightWords,
  loadReadingTime,
  saveReadingTime,
} from '../nlp'

// 用 ref 存储最新的高亮词和 ADHD 状态，避免闭包捕获旧值
function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

interface TocItem {
  id: string
  href: string
  label: string
  subitems?: TocItem[]
}

interface EpubReaderProps {
  bookData: ArrayBuffer
  fileName: string
  onBack: () => void
}

// 颜色选择弹窗组件
const ColorPicker: React.FC<{
  position: { x: number; y: number }
  selectedText: string
  onSelect: (color: string) => void
  onClose: () => void
}> = ({ position, selectedText, onSelect, onClose }) => {
  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />
      {/* 弹窗 */}
      <div
        style={{
          position: 'fixed',
          left: Math.min(position.x, window.innerWidth - 260),
          top: Math.min(position.y + 8, window.innerHeight - 100),
          zIndex: 1000,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '12px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 200,
        }}
      >
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 2,
        }}>
          高亮: <strong style={{ color: 'var(--text-primary)' }}>{selectedText}</strong>
        </div>
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          {Object.entries(HIGHLIGHT_COLORS).map(([key, color]) => (
            <button
              key={key}
              title={color.name}
              onClick={() => onSelect(key)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: color.bg,
                border: `2px solid ${color.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: color.text }}>
                {color.name[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

const EpubReader: React.FC<EpubReaderProps> = ({ bookData, fileName, onBack }) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const contentsRef = useRef<any>(null)

  const [toc, setToc] = useState<TocItem[]>([])
  const [currentChapter, setCurrentChapter] = useState('')
  const [currentChapterTitle, setCurrentChapterTitle] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(2.1)
  const [pagePadding, setPagePadding] = useState(40)
  const [bookTitle, setBookTitle] = useState(fileName.replace('.epub', ''))
  const [isLoading, setIsLoading] = useState(true)

  // 自定义高亮词（按书籍独立存储）
  const [highlightWords, setHighlightWords] = useState<HighlightWord[]>(() => loadHighlightWords(fileName))
  const highlightWordsRef = useLatest(highlightWords)

  // ADHD 模式（拆分为独立子开关）
  const [adhdOptions, setAdhdOptions] = useState<ADHDOptions>({
    enabled: false,
    sentenceBold: true,
    lineHighlight: true,
    paragraphEnhance: true,
    letterSpacing: true,
  })
  const adhdOptionsRef = useLatest(adhdOptions)

  // 阅读计时器
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(() => loadReadingTime(fileName))
  const totalSecondsRef = useRef(totalSeconds)

  // 颜色选择弹窗状态
  const [colorPicker, setColorPicker] = useState<{
    visible: boolean
    x: number
    y: number
    text: string
  }>({ visible: false, x: 0, y: 0, text: '' })

  // 存储 iframe doc 上的事件清理函数
  const cleanupRef = useRef<(() => void) | null>(null)

  // 保存高亮词到 localStorage（按书籍独立存储）
  useEffect(() => {
    saveHighlightWords(highlightWords, fileName)
  }, [highlightWords, fileName])

  // 添加高亮词
  const addHighlightWord = useCallback((text: string, color: string) => {
    setHighlightWords((prev) => {
      const existing = prev.find((w) => w.text === text)
      if (existing) {
        // 已有的词更新颜色
        return prev.map((w) => (w.text === text ? { ...w, color } : w))
      }
      return [...prev, { text, color }]
    })
    setColorPicker({ visible: false, x: 0, y: 0, text: '' })
  }, [])

  // 删除高亮词
  const removeHighlightWord = useCallback((text: string) => {
    setHighlightWords((prev) => prev.filter((w) => w.text !== text))
  }, [])

  // 修改高亮词颜色
  const changeHighlightColor = useCallback((text: string, newColor: string) => {
    setHighlightWords((prev) =>
      prev.map((w) => (w.text === text ? { ...w, color: newColor } : w))
    )
  }, [])

  // 导出高亮词
  const handleExportHighlights = useCallback(() => {
    const jsonStr = exportHighlightWords(highlightWords, bookTitle)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bookTitle}-高亮标记.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [highlightWords, bookTitle])

  // 导入高亮词
  const handleImportHighlights = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const words = importHighlightWords(text)
        if (words && words.length > 0) {
          setHighlightWords((prev) => {
            // 合并导入的词（避免重复）
            const existingTexts = new Set(prev.map(w => w.text))
            const newWords = words.filter(w => !existingTexts.has(w.text))
            return [...prev, ...newWords]
          })
        } else {
          alert('导入失败：文件格式不正确或没有高亮词数据')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  // 应用所有效果（高亮+ADHD）到当前页面
  // 关键：通过 ref 读取最新的 state，避免闭包捕获旧值
  const applyEffects = useCallback((contents: any) => {
    try {
      if (!contents) return
      const doc = contents.document as Document
      if (!doc || !doc.body) return

      // 清理旧的事件监听
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      // ★ 核心修复：清除之前的所有 DOM 效果（高亮 span、ADHD span 等），恢复原始文本节点
      clearAllEffects(doc)

      const words = highlightWordsRef.current
      const opts = adhdOptionsRef.current
      const adhdOn = opts.enabled

      // 注入高亮样式
      let styleEl = doc.getElementById('custom-highlight-styles')
      if (!styleEl) {
        styleEl = doc.createElement('style')
        styleEl.id = 'custom-highlight-styles'
        doc.head.appendChild(styleEl)
      }

      let css = generateHighlightStyles(words)
      if (adhdOn) {
        css += generateADHDStyles({
          sentenceBold: opts.sentenceBold,
          lineHighlight: opts.lineHighlight,
          paragraphEnhance: opts.paragraphEnhance,
          letterSpacing: opts.letterSpacing,
        })
      }
      styleEl.textContent = css

      // ADHD 字间距
      if (adhdOn && opts.letterSpacing) {
        doc.body.classList.add('adhd-spacing')
      } else {
        doc.body.classList.remove('adhd-spacing')
      }

      // 应用高亮词（DOM 操作必须在 ADHD 之前，因为都要遍历文本节点）
      if (words.length > 0) {
        applyCustomHighlights(doc, words)
      }

      // 应用 ADHD 效果
      if (adhdOn && opts.sentenceBold) {
        applyADHDSentenceBold(doc)
      }
      if (adhdOn && opts.paragraphEnhance) {
        applyADHDParagraphEnhance(doc)
      }

      // --- 监听文本选择（mouseup） ---
      const handleMouseUp = (_e: MouseEvent) => {
        setTimeout(() => {
          const selection = doc.getSelection()
          if (!selection || selection.toString().trim().length === 0) return

          const text = selection.toString().trim()
          if (text.length > 20 || text.length < 1) return

          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()

          // iframe 的位置偏移
          const iframe = viewerRef.current?.querySelector('iframe')
          const iframeRect = iframe?.getBoundingClientRect()
          const offsetX = iframeRect?.left || 0
          const offsetY = iframeRect?.top || 0

          setColorPicker({
            visible: true,
            x: rect.left + offsetX,
            y: rect.bottom + offsetY,
            text,
          })
        }, 10)
      }
      doc.addEventListener('mouseup', handleMouseUp, true)

      // --- ADHD 行高亮 ---
      let adhdCleanup: (() => void) | null = null
      if (adhdOn && opts.lineHighlight) {
        adhdCleanup = setupLineHighlight(doc)
      }

      // 保存清理函数
      cleanupRef.current = () => {
        doc.removeEventListener('mouseup', handleMouseUp, true)
        if (adhdCleanup) adhdCleanup()
      }

      contentsRef.current = contents
    } catch (err) {
      console.warn('效果处理出错:', err)
    }
  }, []) // 不依赖任何 state，通过 ref 读取最新值

  // ADHD 当前行高亮功能 - 返回清理函数
  const setupLineHighlight = useCallback((doc: Document): (() => void) => {
    // 移除已有的行高亮元素
    const existingOverlay = doc.getElementById('adhd-line-overlay')
    if (existingOverlay) existingOverlay.remove()

    // 创建行高亮元素
    const overlay = doc.createElement('div')
    overlay.id = 'adhd-line-overlay'
    overlay.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:9999;'

    const dimTop = doc.createElement('div')
    dimTop.style.cssText = 'position:absolute;left:0;right:0;top:0;background:rgba(0,0,0,0.18);pointer-events:none;transition:height 0.12s ease;'

    const focusLine = doc.createElement('div')
    focusLine.style.cssText = 'position:absolute;left:0;right:0;background:rgba(245,158,11,0.12);border-top:2px solid rgba(245,158,11,0.35);border-bottom:2px solid rgba(245,158,11,0.35);pointer-events:none;transition:top 0.12s ease, height 0.12s ease;'

    const dimBottom = doc.createElement('div')
    dimBottom.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,0.18);pointer-events:none;transition:height 0.12s ease;'

    overlay.appendChild(dimTop)
    overlay.appendChild(focusLine)
    overlay.appendChild(dimBottom)
    doc.body.appendChild(overlay)

    const computedLineHeight = fontSize * lineHeight
    // 三行范围
    const focusHeight = computedLineHeight * 3 + 16

    const handleMouseMove = (e: MouseEvent) => {
      const mouseY = e.clientY

      // 尝试吸附到鼠标所在的文本行
      let snapY = mouseY

      // 方法：用 caretRangeFromPoint 定位鼠标下最近的文本行
      try {
        const caretRange = (doc as any).caretRangeFromPoint?.(e.clientX, e.clientY)
        if (caretRange) {
          const rangeRect = caretRange.getBoundingClientRect()
          if (rangeRect && rangeRect.height > 0) {
            // 吸附到该行的垂直中心
            snapY = rangeRect.top + rangeRect.height / 2
          }
        } else {
          // 备用方案：elementFromPoint
          const el = doc.elementFromPoint(e.clientX, e.clientY)
          if (el && el !== doc.body && el !== doc.documentElement) {
            const elRect = el.getBoundingClientRect()
            if (elRect.height > 0 && elRect.height < 200) {
              snapY = elRect.top + elRect.height / 2
            }
          }
        }
      } catch (_) {
        // 如果获取失败，退回到鼠标位置
        snapY = mouseY
      }

      const top = Math.max(0, snapY - focusHeight / 2)

      dimTop.style.height = `${top}px`
      focusLine.style.top = `${top}px`
      focusLine.style.height = `${focusHeight}px`
      dimBottom.style.top = `${top + focusHeight}px`
    }
    doc.addEventListener('mousemove', handleMouseMove)

    // 返回清理函数
    return () => {
      doc.removeEventListener('mousemove', handleMouseMove)
      const el = doc.getElementById('adhd-line-overlay')
      if (el) el.remove()
    }
  }, [fontSize, lineHeight])

  // 初始化 EPUB
  useEffect(() => {
    if (!viewerRef.current) return

    const book = new ePub(bookData)
    bookRef.current = book

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: 'paginated',
    })
    renditionRef.current = rendition

    // 设置主题样式
    rendition.themes.default({
      body: {
        'font-family': "'Noto Serif SC', 'Source Han Serif SC', Georgia, serif !important",
        'font-size': `${fontSize}px !important`,
        'line-height': `${lineHeight} !important`,
        'color': isDarkMode ? '#e8e8e8 !important' : '#1a1a1a !important',
        'background': isDarkMode ? '#16213e !important' : '#fffdf8 !important',
        'padding': `20px ${pagePadding}px !important`,
        'max-width': '800px !important',
        'margin': '0 auto !important',
      },
      'p': {
        'text-indent': '2em !important',
        'margin-bottom': '0.8em !important',
      },
      'h1, h2, h3, h4': {
        'text-indent': '0 !important',
        'margin-top': '1.5em !important',
        'margin-bottom': '0.8em !important',
        'font-weight': '700 !important',
      },
    })

    // 加载目录
    book.loaded.navigation.then((nav: any) => {
      const tocItems = nav.toc.map((item: any) => ({
        id: item.id,
        href: item.href,
        label: item.label.trim(),
        subitems: item.subitems?.map((sub: any) => ({
          id: sub.id,
          href: sub.href,
          label: sub.label.trim(),
        })),
      }))
      setToc(tocItems)
    })

    // 加载元数据
    book.loaded.metadata.then((meta: any) => {
      if (meta.title) {
        setBookTitle(meta.title)
      }
    })

    // 监听翻页
    rendition.on('relocated', (location: any) => {
      setIsLoading(false)

      // 更新进度
      if (location.start) {
        const currentPage = location.start.displayed?.page || 0
        const totalPages = location.start.displayed?.total || 1
        const chapterProgress = (currentPage / totalPages) * 100
        setProgress(chapterProgress)

        // 更新当前章节
        setCurrentChapter(location.start.href)
      }

      // 关闭颜色选择器
      setColorPicker({ visible: false, x: 0, y: 0, text: '' })
    })

    // 内容渲染完成后应用效果
    rendition.hooks.content.register((contents: any) => {
      applyEffects(contents)
    })

    // 显示第一页
    rendition.display()

    // 键盘翻页
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        rendition.prev()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        rendition.next()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      book.destroy()
    }
  }, [bookData]) // eslint-disable-line react-hooks/exhaustive-deps

  // 字号变化时更新渲染（修复：priority 通过第三个参数传递，而非写在值中）
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.override('font-size', `${fontSize}px`, true)
    }
  }, [fontSize])

  // 行间距变化时更新渲染
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.override('line-height', `${lineHeight}`, true)
    }
  }, [lineHeight])

  // 页边距变化时更新渲染
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.override('padding', `20px ${pagePadding}px`, true)
    }
  }, [pagePadding])

  // 主题变化
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    if (renditionRef.current) {
      renditionRef.current.themes.override('color', isDarkMode ? '#e8e8e8' : '#1a1a1a', true)
      renditionRef.current.themes.override('background', isDarkMode ? '#16213e' : '#fffdf8', true)
    }
  }, [isDarkMode])

  // ★ 核心修复：高亮词或 ADHD 模式切换后，直接在已有的 contents 上重新应用效果
  // 不再依赖 display(cfi) 间接触发 hooks.content，因为同一 section 内不会重新触发
  useEffect(() => {
    if (contentsRef.current && !isLoading) {
      applyEffects(contentsRef.current)
    }
  }, [highlightWords, adhdOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  // 根据 currentChapter 查找对应的标题
  useEffect(() => {
    const findTitle = (items: TocItem[]): string => {
      for (const item of items) {
        if (item.href === currentChapter) return item.label
        if (item.subitems) {
          const found = findTitle(item.subitems)
          if (found) return found
        }
      }
      return ''
    }
    const title = findTitle(toc)
    setCurrentChapterTitle(title || bookTitle)
  }, [currentChapter, toc, bookTitle])

  // 阅读计时器 - 每秒更新
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
      setTotalSeconds((prev) => {
        const next = prev + 1
        totalSecondsRef.current = next
        return next
      })
    }, 1000)

    // 定期保存（每30秒）
    const saveTimer = setInterval(() => {
      saveReadingTime(fileName, totalSecondsRef.current)
    }, 30000)

    return () => {
      clearInterval(timer)
      clearInterval(saveTimer)
      // 卸载时保存最终时间
      saveReadingTime(fileName, totalSecondsRef.current)
    }
  }, [fileName])

  // ADHD 总开关切换
  const handleToggleADHD = useCallback(() => {
    setAdhdOptions((prev) => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  // ADHD 子选项切换
  const handleToggleADHDOption = useCallback((key: keyof Omit<ADHDOptions, 'enabled'>) => {
    setAdhdOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleNavigate = (href: string) => {
    renditionRef.current?.display(href)
  }

  const handlePrev = () => {
    renditionRef.current?.prev()
  }

  const handleNext = () => {
    renditionRef.current?.next()
  }

  return (
    <div style={styles.container}>
      <Toolbar
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onPrevPage={handlePrev}
        onNextPage={handleNext}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onToggleADHD={handleToggleADHD}
        onToggleADHDOption={handleToggleADHDOption}
        isDarkMode={isDarkMode}
        adhdOptions={adhdOptions}
        currentChapterTitle={currentChapterTitle}
        progress={progress}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
        pagePadding={pagePadding}
        onPagePaddingChange={setPagePadding}
        sessionSeconds={sessionSeconds}
        totalSeconds={totalSeconds}
      />

      <div style={styles.body}>
        {/* 侧边栏 */}
        {showSidebar && (
          <Sidebar
            toc={toc}
            currentChapter={currentChapter}
            onNavigate={handleNavigate}
            bookTitle={bookTitle}
            onClose={() => setShowSidebar(false)}
            highlightWords={highlightWords}
            onRemoveHighlight={removeHighlightWord}
            onChangeHighlightColor={changeHighlightColor}
            onExportHighlights={handleExportHighlights}
            onImportHighlights={handleImportHighlights}
          />
        )}

        {/* 阅读区域 */}
        <div style={styles.readerArea}>
          {/* 返回按钮 */}
          <button style={styles.backBtn} onClick={onBack} title="返回">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            换书
          </button>

          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingSpinner} />
              <p style={styles.loadingText}>正在加载书籍...</p>
            </div>
          )}

          <div
            ref={viewerRef}
            style={{
              ...styles.viewer,
              opacity: isLoading ? 0 : 1,
            }}
          />

          {/* 翻页热区 */}
          <div style={styles.prevHotzone} onClick={handlePrev} />
          <div style={styles.nextHotzone} onClick={handleNext} />
        </div>
      </div>

      {/* 颜色选择弹窗 */}
      {colorPicker.visible && (
        <ColorPicker
          position={{ x: colorPicker.x, y: colorPicker.y }}
          selectedText={colorPicker.text}
          onSelect={(color) => addHighlightWord(colorPicker.text, color)}
          onClose={() => setColorPicker({ visible: false, x: 0, y: 0, text: '' })}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  readerArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  viewer: {
    width: '100%',
    height: '100%',
    transition: 'opacity 0.3s ease',
  },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 5,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease',
  },
  prevHotzone: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '15%',
    height: '100%',
    cursor: 'w-resize',
    zIndex: 2,
  },
  nextHotzone: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '15%',
    height: '100%',
    cursor: 'e-resize',
    zIndex: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    zIndex: 10,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--accent-color)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
}

// 注入 spinner 动画
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(styleSheet)
}

export default EpubReader
