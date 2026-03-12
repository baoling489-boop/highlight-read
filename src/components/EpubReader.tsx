import React, { useEffect, useRef, useState, useCallback } from 'react'
import ePub from 'epubjs'
import Toolbar, { ADHDOptions } from './Toolbar'
import Sidebar from './Sidebar'
import {
  HighlightWord,
  Bookmark,
  HIGHLIGHT_COLORS,
  generateHighlightStyles,
  generateADHDStyles,
  applyCustomHighlights,
  applyADHDSentenceBold,
  clearAllEffects,
  loadHighlightWords,
  saveHighlightWords,
  exportHighlightWords,
  importHighlightWords,
  loadReadingTime,
  saveReadingTime,
  loadBookmarks,
  saveBookmarks,
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

  const [bookTitle, setBookTitle] = useState(fileName.replace('.epub', ''))
  const [isLoading, setIsLoading] = useState(true)

  // 自定义高亮词（按书籍独立存储）
  const [highlightWords, setHighlightWords] = useState<HighlightWord[]>(() => loadHighlightWords(fileName))
  const highlightWordsRef = useLatest(highlightWords)

  // 书签（按书籍独立存储）
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks(fileName))

  // ADHD 模式（拆分为独立子开关）
  const [adhdOptions, setAdhdOptions] = useState<ADHDOptions>({
    enabled: false,
    sentenceBold: true,
    lineHighlight: true,
    letterSpacing: true,
    lineSpacingEnhance: false,
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

  // 全书字数进度：每章字数和累计字数
  const chapterCharsRef = useRef<{ href: string; chars: number; cumChars: number }[]>([])
  const totalCharsRef = useRef(0)
  // iframe 滚动进度清理函数
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  // 保存高亮词到 localStorage（按书籍独立存储）
  useEffect(() => {
    saveHighlightWords(highlightWords, fileName)
  }, [highlightWords, fileName])

  // 保存书签到 localStorage（按书籍独立存储）
  useEffect(() => {
    saveBookmarks(bookmarks, fileName)
  }, [bookmarks, fileName])

  // 添加书签
  const addBookmark = useCallback(() => {
    const location = renditionRef.current?.location
    if (!location?.start?.cfi) return

    const cfi = location.start.cfi

    // 检查是否已存在相同 CFI 的书签
    setBookmarks((prev) => {
      if (prev.some((b) => b.cfi === cfi)) return prev

      // 获取当前页面文本摘要
      let textSnippet = ''
      try {
        const doc = contentsRef.current?.document as Document
        if (doc?.body) {
          const text = doc.body.innerText || ''
          textSnippet = text.substring(0, 50).replace(/\s+/g, ' ').trim()
          if (text.length > 50) textSnippet += '...'
        }
      } catch (_) {}

      const newBookmark: Bookmark = {
        id: `bm_${Date.now()}`,
        cfi,
        chapter: currentChapterTitle,
        text: textSnippet || '（无文本）',
        progress: Math.round(progress * 100) / 100,
        createdAt: Date.now(),
      }
      return [...prev, newBookmark]
    })
  }, [currentChapterTitle, progress])

  // 删除书签
  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  // 跳转到书签
  const navigateToBookmark = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi)
  }, [])

  // 判断当前位置是否已有书签
  const isCurrentPageBookmarked = bookmarks.some((b) => {
    const currentCfi = renditionRef.current?.location?.start?.cfi
    return currentCfi && b.cfi === currentCfi
  })

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
          letterSpacing: opts.letterSpacing,
          lineSpacingEnhance: opts.lineSpacingEnhance,
        })
      }
      styleEl.textContent = css

      // ADHD 字间距
      if (adhdOn && opts.letterSpacing) {
        doc.body.classList.add('adhd-spacing')
      } else {
        doc.body.classList.remove('adhd-spacing')
      }

      // ADHD 行间距增强
      if (adhdOn && opts.lineSpacingEnhance) {
        doc.body.classList.add('adhd-line-spacing-enhance')
      } else {
        doc.body.classList.remove('adhd-line-spacing-enhance')
      }

      // 应用高亮词（DOM 操作必须在 ADHD 之前，因为都要遍历文本节点）
      if (words.length > 0) {
        applyCustomHighlights(doc, words)
      }

      // 应用 ADHD 效果
      if (adhdOn && opts.sentenceBold) {
        applyADHDSentenceBold(doc)
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
    dimTop.style.cssText = 'position:absolute;left:0;right:0;top:0;background:rgba(0,0,0,0.08);pointer-events:none;transition:height 0.12s ease;'

    const focusLine = doc.createElement('div')
    focusLine.style.cssText = 'position:absolute;left:0;right:0;background:rgba(245,158,11,0.06);border-left:3px solid rgba(245,158,11,0.5);pointer-events:none;transition:top 0.12s ease, height 0.12s ease;'

    const dimBottom = doc.createElement('div')
    dimBottom.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,0.08);pointer-events:none;transition:height 0.12s ease;'

    overlay.appendChild(dimTop)
    overlay.appendChild(focusLine)
    overlay.appendChild(dimBottom)
    doc.body.appendChild(overlay)

    // 使用固定基础行间距 2.0 计算焦点区域高度
    const BASE_LINE_HEIGHT = 2.0
    const computedLineHeight = fontSize * BASE_LINE_HEIGHT
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
  }, [fontSize])

  // 用 ref 存储最新的排版参数，避免闭包过期
  const fontSizeRef = useLatest(fontSize)
  const isDarkModeRef = useLatest(isDarkMode)

  // 固定基础行间距
  const BASE_LINE_HEIGHT = 2.0

  // 在 iframe 中注入自定义排版样式（直接操作 DOM，绕过 epub.js themes 的限制）
  const injectCustomStyles = useCallback((doc: Document) => {
    const fs = fontSizeRef.current
    const dark = isDarkModeRef.current

    let styleEl = doc.getElementById('custom-layout-styles')
    if (!styleEl) {
      styleEl = doc.createElement('style')
      styleEl.id = 'custom-layout-styles'
      doc.head.appendChild(styleEl)
    }

    styleEl.textContent = `
      /* ===== 基础排版 ===== */
      html {
        scroll-behavior: smooth !important;
      }
      body {
        font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', Georgia, serif !important;
        font-size: ${fs}px !important;
        line-height: ${BASE_LINE_HEIGHT} !important;
        color: ${dark ? '#e0e0e0' : '#222222'} !important;
        background: ${dark ? '#16213e' : '#fffdf8'} !important;
        padding: 20px clamp(16px, 5vw, 48px) !important;
        max-width: 42em !important;
        margin: 0 auto !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        transition: background-color 0.3s ease, color 0.3s ease !important;
      }

      /* ===== 段落排版 ===== */
      p {
        text-indent: 2em !important;
        margin-bottom: 0.6lh !important;
        transition: color 0.3s ease !important;
      }

      /* ===== 标题层次 ===== */
      h1, h2, h3, h4, h5, h6 {
        text-indent: 0 !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
        transition: color 0.3s ease !important;
      }
      h1 {
        font-size: 1.6em !important;
        margin-top: 2em !important;
        margin-bottom: 0.8em !important;
      }
      h2 {
        font-size: 1.4em !important;
        margin-top: 1.8em !important;
        margin-bottom: 0.7em !important;
      }
      h3 {
        font-size: 1.2em !important;
        margin-top: 1.5em !important;
        margin-bottom: 0.6em !important;
      }
      h4 {
        font-size: 1.1em !important;
        margin-top: 1.3em !important;
        margin-bottom: 0.5em !important;
      }

      /* ===== 暗色模式元素适配 ===== */
      a {
        color: ${dark ? '#93c5fd' : '#4f46e5'} !important;
        text-decoration-color: ${dark ? 'rgba(147, 197, 253, 0.3)' : 'rgba(79, 70, 229, 0.3)'} !important;
        transition: color 0.3s ease !important;
      }
      a:hover {
        text-decoration-color: ${dark ? 'rgba(147, 197, 253, 0.7)' : 'rgba(79, 70, 229, 0.7)'} !important;
      }
      blockquote {
        border-left: 3px solid ${dark ? '#4a4a6a' : '#d4d0ca'} !important;
        background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} !important;
        padding: 0.8em 1.2em !important;
        margin: 1em 0 !important;
        border-radius: 0 4px 4px 0 !important;
        transition: background-color 0.3s ease, border-color 0.3s ease !important;
      }
      code {
        background: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'} !important;
        padding: 0.15em 0.4em !important;
        border-radius: 3px !important;
        font-size: 0.9em !important;
        transition: background-color 0.3s ease !important;
      }
      pre {
        background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'} !important;
        padding: 1em !important;
        border-radius: 6px !important;
        overflow-x: auto !important;
        transition: background-color 0.3s ease !important;
      }
      pre code {
        background: transparent !important;
        padding: 0 !important;
      }
      hr {
        border: none !important;
        border-top: 1px solid ${dark ? '#2a2a4a' : '#e8e5e0'} !important;
        margin: 2em 0 !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      th, td {
        border: 1px solid ${dark ? '#2a2a4a' : '#e8e5e0'} !important;
        padding: 0.5em 0.8em !important;
      }
      th {
        background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important;
      }

      /* ===== 选中文本样式 ===== */
      ::selection {
        background: rgba(99, 102, 241, 0.25);
        color: inherit;
      }
      ::-moz-selection {
        background: rgba(99, 102, 241, 0.25);
        color: inherit;
      }

      /* ===== 图片自适应 ===== */
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 4px !important;
      }

      /* ===== iframe 内滚动条细化 ===== */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'};
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)'};
      }
    `
  }, []) // 不依赖 state，通过 ref 读取

  // 根据当前章节 href + iframe 内滚动比例，计算全书字数进度
  const calcProgressByChars = useCallback((href: string, scrollRatio: number) => {
    const chapters = chapterCharsRef.current
    const total = totalCharsRef.current
    if (!chapters.length || total === 0) return

    // 标准化 href：去掉 # 锚点和路径前缀
    const normalizeHref = (h: string) => h.replace(/#.*$/, '').replace(/^\/+/, '')
    const normHref = normalizeHref(href)

    const chapter = chapters.find((c) => normalizeHref(c.href) === normHref)
    if (!chapter) return

    const charsBefore = chapter.cumChars
    const charsInChapter = chapter.chars * Math.max(0, Math.min(1, scrollRatio))
    const pct = ((charsBefore + charsInChapter) / total) * 100
    setProgress(Math.round(pct * 100) / 100)
  }, [])

  // 创建和配置 rendition 的共用函数（固定滚动模式）
  const setupRendition = useCallback((book: any, container: HTMLDivElement) => {
    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: 'scrolled-doc',
    })
    renditionRef.current = rendition

    // 监听章节切换
    rendition.on('relocated', (location: any) => {
      setIsLoading(false)

      if (location.start?.href) {
        setCurrentChapter(location.start.href)
        // 章节切换时，以滚动位置 0 计算进度
        calcProgressByChars(location.start.href, 0)
      }

      // 关闭颜色选择器
      setColorPicker({ visible: false, x: 0, y: 0, text: '' })
    })

    // 内容渲染完成后注入自定义样式 + 应用高亮/ADHD效果 + 监听滚动
    rendition.hooks.content.register((contents: any) => {
      try {
        const doc = contents.document as Document
        if (doc) {
          injectCustomStyles(doc)
        }
      } catch (_) {}
      applyEffects(contents)

      // 监听 iframe 内的滚动事件，实时更新进度
      try {
        // 先清理旧的滚动监听
        if (scrollCleanupRef.current) {
          scrollCleanupRef.current()
          scrollCleanupRef.current = null
        }

        const doc = contents.document as Document
        const win = doc.defaultView
        if (win && doc.body) {
          const handleScroll = () => {
            const scrollTop = win.scrollY || doc.documentElement.scrollTop || 0
            const scrollHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight || 1
            const clientHeight = win.innerHeight || doc.documentElement.clientHeight || 1
            const maxScroll = scrollHeight - clientHeight
            const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0

            // 获取当前章节 href
            const loc = renditionRef.current?.location
            const href = loc?.start?.href || ''
            if (href) {
              calcProgressByChars(href, ratio)
            }
          }

          win.addEventListener('scroll', handleScroll, { passive: true })
          scrollCleanupRef.current = () => {
            win.removeEventListener('scroll', handleScroll)
          }
        }
      } catch (_) {}
    })

    return rendition
  }, [applyEffects, injectCustomStyles, calcProgressByChars])

  // 初始化 EPUB
  useEffect(() => {
    if (!viewerRef.current) return

    const book = new ePub(bookData)
    bookRef.current = book

    const rendition = setupRendition(book, viewerRef.current)

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

    // 显示第一页
    rendition.display()

    // 统计全书各章字数（用于按字数计算阅读进度）
    book.ready.then(async () => {
      try {
        const spine = (book as any).spine
        const items = spine.items || spine.spineItems || []
        const chapters: { href: string; chars: number; cumChars: number }[] = []
        let cumulative = 0

        for (const item of items) {
          try {
            // 加载章节内容并统计字数
            const doc = await (book as any).load(item.href)
            let text = ''
            if (doc && typeof (doc as any).querySelector === 'function') {
              const body = (doc as any).querySelector('body')
              text = body?.textContent || ''
            } else if (typeof doc === 'string') {
              text = doc.replace(/<[^>]*>/g, '')
            }
            const charCount = text.replace(/\s+/g, '').length
            chapters.push({ href: item.href, chars: charCount, cumChars: cumulative })
            cumulative += charCount
          } catch (_) {
            // 某些资源文件可能加载失败，跳过
            chapters.push({ href: item.href, chars: 0, cumChars: cumulative })
          }
        }

        chapterCharsRef.current = chapters
        totalCharsRef.current = cumulative
      } catch (err) {
        console.warn('统计全书字数失败:', err)
      }
    })

    // 键盘操作：scrolled-doc 模式下实现平滑滚动
    const handleKeyPress = (e: KeyboardEvent) => {
      // 获取 iframe 内的 window 用于滚动
      const iframe = viewerRef.current?.querySelector('iframe')
      const iframeWin = iframe?.contentWindow
      const iframeDoc = iframe?.contentDocument

      if (e.key === 'ArrowLeft') {
        // 上一章
        renditionRef.current?.prev()
      } else if (e.key === 'ArrowRight') {
        // 下一章
        renditionRef.current?.next()
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        // 向下平滑滚动约 85% 视口高度
        e.preventDefault()
        if (iframeWin && iframeDoc) {
          const clientHeight = iframeWin.innerHeight || iframeDoc.documentElement.clientHeight || 600
          const scrollTop = iframeWin.scrollY || iframeDoc.documentElement.scrollTop || 0
          const scrollHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight || 1
          const maxScroll = scrollHeight - clientHeight

          if (scrollTop >= maxScroll - 5) {
            // 已到底部，翻下一章
            renditionRef.current?.next()
          } else {
            iframeWin.scrollBy({ top: Math.round(clientHeight * 0.85), behavior: 'smooth' })
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        // 向上平滑滚动约 85% 视口高度
        e.preventDefault()
        if (iframeWin && iframeDoc) {
          const clientHeight = iframeWin.innerHeight || iframeDoc.documentElement.clientHeight || 600
          const scrollTop = iframeWin.scrollY || iframeDoc.documentElement.scrollTop || 0

          if (scrollTop <= 5) {
            // 已到顶部，翻上一章
            renditionRef.current?.prev()
          } else {
            iframeWin.scrollBy({ top: -Math.round(clientHeight * 0.85), behavior: 'smooth' })
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current()
        scrollCleanupRef.current = null
      }
      book.destroy()
    }
  }, [bookData]) // eslint-disable-line react-hooks/exhaustive-deps

  // 字号/行间距/主题变化时，重新注入 iframe 样式
  useEffect(() => {
    if (!contentsRef.current) return
    try {
      const doc = contentsRef.current.document as Document
      if (doc) {
        injectCustomStyles(doc)
      }
    } catch (_) {}
  }, [fontSize, isDarkMode, injectCustomStyles])

  // 主题变化时更新主文档属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
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
        sessionSeconds={sessionSeconds}
        totalSeconds={totalSeconds}
        onBack={onBack}
        isBookmarked={isCurrentPageBookmarked}
        onToggleBookmark={addBookmark}
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
            bookmarks={bookmarks}
            onRemoveBookmark={removeBookmark}
            onNavigateBookmark={navigateToBookmark}
          />
        )}

        {/* 阅读区域 */}
        <div style={styles.readerArea}>
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingSpinner} />
              <p style={styles.loadingText}>正在加载书籍...</p>
            </div>
          )}

          {/* 左侧热区：点击切换上一章 */}
          <div
            style={styles.prevHotzone}
            onClick={handlePrev}
            title="上一章"
            className="hotzone-prev"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.hotzoneArrow}>
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* epub.js 渲染容器 */}
          <div
            ref={viewerRef}
            style={{
              ...styles.viewer,
              opacity: isLoading ? 0 : 1,
            }}
          />

          {/* 右侧热区：点击切换下一章 */}
          <div
            style={styles.nextHotzone}
            onClick={handleNext}
            title="下一章"
            className="hotzone-next"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.hotzoneArrow}>
              <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
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
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  viewer: {
    flex: 1,
    height: '100%',
    transition: 'opacity 0.3s ease',
  },
  prevHotzone: {
    width: 60,
    minWidth: 60,
    height: '100%',
    cursor: 'w-resize',
    zIndex: 2,
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s ease',
  },
  nextHotzone: {
    width: 60,
    minWidth: 60,
    height: '100%',
    cursor: 'e-resize',
    zIndex: 2,
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s ease',
  },
  hotzoneArrow: {
    opacity: 0,
    transition: 'opacity 0.3s ease',
    color: 'var(--text-muted)',
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
