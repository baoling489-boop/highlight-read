/**
 * 高亮词条目
 */
export interface HighlightWord {
  text: string
  color: string // 颜色 key，如 'blue', 'green' 等
}

/**
 * 预设颜色方案
 */
export const HIGHLIGHT_COLORS: Record<string, { name: string; bg: string; border: string; text: string }> = {
  blue: {
    name: '蓝色',
    bg: 'rgba(59, 130, 246, 0.2)',
    border: '#3b82f6',
    text: '#2563eb',
  },
  green: {
    name: '绿色',
    bg: 'rgba(16, 185, 129, 0.2)',
    border: '#10b981',
    text: '#059669',
  },
  yellow: {
    name: '黄色',
    bg: 'rgba(245, 158, 11, 0.2)',
    border: '#f59e0b',
    text: '#d97706',
  },
  orange: {
    name: '橙色',
    bg: 'rgba(249, 115, 22, 0.2)',
    border: '#f97316',
    text: '#ea580c',
  },
  purple: {
    name: '紫色',
    bg: 'rgba(139, 92, 246, 0.2)',
    border: '#8b5cf6',
    text: '#7c3aed',
  },
  red: {
    name: '红色',
    bg: 'rgba(239, 68, 68, 0.2)',
    border: '#ef4444',
    text: '#dc2626',
  },
  teal: {
    name: '青色',
    bg: 'rgba(20, 184, 166, 0.2)',
    border: '#14b8a6',
    text: '#0d9488',
  },
  pink: {
    name: '粉色',
    bg: 'rgba(236, 72, 153, 0.2)',
    border: '#ec4899',
    text: '#db2777',
  },
  indigo: {
    name: '靛蓝',
    bg: 'rgba(99, 102, 241, 0.2)',
    border: '#6366f1',
    text: '#4f46e5',
  },
  brown: {
    name: '棕色',
    bg: 'rgba(180, 83, 9, 0.2)',
    border: '#b45309',
    text: '#92400e',
  },
}

/**
 * 生成高亮词的 CSS 样式
 */
export function generateHighlightStyles(words: HighlightWord[]): string {
  let css = ''

  // 为每种颜色生成样式
  for (const [key, color] of Object.entries(HIGHLIGHT_COLORS)) {
    css += `
      .user-highlight-${key} {
        background-color: ${color.bg};
        border-bottom: 2px solid ${color.border};
        padding: 1px 2px;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .user-highlight-${key}:hover {
        background-color: ${color.bg.replace('0.2', '0.35')};
        box-shadow: 0 2px 6px ${color.bg.replace('0.2', '0.3')};
      }
    `
  }

  return css
}

/**
 * 生成 ADHD 模式的 CSS 样式
 * isDark: 是否为暗色模式，用于适配句首/句尾颜色
 */
export function generateADHDStyles(options: {
  sentenceBold: boolean
  lineHighlight: boolean
  letterSpacing: boolean
  lineSpacingEnhance: boolean
  isDark?: boolean
}): string {
  let css = ''
  const dark = options.isDark ?? false

  // 句首渐变加粗 + 句尾渐变
  if (options.sentenceBold) {
    if (dark) {
      // 暗色模式（正文 #e0e0e0，背景深蓝）
      // 句首：白色渐变到正文色，字重从 900 到 500
      // 句尾：用偏蓝灰色系，视觉有辨识度但不会太暗
      css += `
        .adhd-head-1 { font-weight: 900 !important; color: #ffffff !important; }
        .adhd-head-2 { font-weight: 800 !important; color: #f0f0f0 !important; }
        .adhd-head-3 { font-weight: 700 !important; color: #e0e0e0 !important; }
        .adhd-head-4 { font-weight: 650 !important; color: #d4d4d4 !important; }
        .adhd-head-5 { font-weight: 600 !important; color: #c8c8c8 !important; }
        .adhd-tail-1 { color: #b0b8c8 !important; }
        .adhd-tail-2 { color: #9aa4b8 !important; }
        .adhd-tail-3 { color: #8690a5 !important; }
        .adhd-tail-4 { color: #727d93 !important; }
        .adhd-tail-5 { color: #606b82 !important; }
      `
    } else {
      // 浅色模式（正文 #222）
      // 句首：纯黑渐变到正文色，渐变更缓更自然
      // 句尾：改用蓝灰色系（slate），视觉上有色彩辨识度但不会太淡
      css += `
        .adhd-head-1 { font-weight: 900 !important; color: #000000 !important; }
        .adhd-head-2 { font-weight: 800 !important; color: #0a0a0a !important; }
        .adhd-head-3 { font-weight: 700 !important; color: #151515 !important; }
        .adhd-head-4 { font-weight: 650 !important; color: #1c1c1c !important; }
        .adhd-head-5 { font-weight: 600 !important; color: #222222 !important; }
        .adhd-tail-1 { color: #334155 !important; }
        .adhd-tail-2 { color: #3d4d63 !important; }
        .adhd-tail-3 { color: #475569 !important; }
        .adhd-tail-4 { color: #546478 !important; }
        .adhd-tail-5 { color: #64748b !important; }
      `
    }
  }

  // 当前行高亮 — 使用更柔和的样式，避免与高亮/句首句尾冲突
  if (options.lineHighlight) {
    css += `
      .adhd-line-highlight-active {
        position: relative;
      }
      .adhd-line-overlay {
        position: fixed;
        left: 0;
        right: 0;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }
      .adhd-focus-line {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(245, 158, 11, 0.06);
        border-left: 3px solid rgba(245, 158, 11, 0.5);
        transition: top 0.15s ease;
        pointer-events: none;
      }
      .adhd-dim-overlay-top, .adhd-dim-overlay-bottom {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.08);
        pointer-events: none;
        transition: all 0.15s ease;
      }
    `
  }

  // 字间距微调
  if (options.letterSpacing) {
    css += `
      body.adhd-spacing,
      body.adhd-spacing * {
        letter-spacing: 0.05em !important;
        word-spacing: 0.12em !important;
      }
    `
  }

  // 行间距增强
  if (options.lineSpacingEnhance) {
    css += `
      body.adhd-line-spacing-enhance,
      body.adhd-line-spacing-enhance * {
        line-height: 2.4 !important;
      }
    `
  }

  return css
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 在文档中应用自定义高亮词
 * 优化：将所有高亮词编译为单一正则表达式，一次性匹配，避免 N×M 嵌套循环
 */
export function applyCustomHighlights(doc: Document, words: HighlightWord[]): void {
  if (!words.length) return

  const body = doc.body
  if (!body) return

  // 构建词 → 颜色映射表
  const wordColorMap = new Map<string, string>()
  for (const w of words) {
    wordColorMap.set(w.text, w.color)
  }

  // 将所有高亮词编译为单一正则（按长度降序，优先匹配长词）
  const sortedWords = [...words].sort((a, b) => b.text.length - a.text.length)
  const pattern = sortedWords.map((w) => escapeRegExp(w.text)).join('|')
  const regex = new RegExp(pattern, 'g')

  // 遍历所有文本节点
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text)) {
    if (node.textContent && node.textContent.trim().length > 0) {
      const parent = node.parentElement
      if (parent && parent.className) {
        // 跳过已高亮/ADHD 标记节点
        if (parent.className.startsWith('user-highlight-') ||
            parent.className.includes('adhd-bold') ||
            parent.className.includes('adhd-head-') ||
            parent.className.includes('adhd-tail-') ||
            parent.className.includes('adhd-para-first')) {
          continue
        }
      }
      textNodes.push(node)
    }
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || ''
    if (text.trim().length < 1) continue

    // 用单一正则一次性查找所有匹配
    regex.lastIndex = 0
    const matches: { start: number; end: number; color: string }[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0]
      const color = wordColorMap.get(matchedText)
      if (color) {
        matches.push({
          start: match.index,
          end: match.index + matchedText.length,
          color,
        })
      }
    }

    if (matches.length === 0) continue

    // 去重重叠（已按位置顺序，正则保证不重叠，但以防万一）
    const filtered: typeof matches = []
    for (const m of matches) {
      if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) {
        filtered.push(m)
      }
    }

    // 创建文档片段
    const fragment = doc.createDocumentFragment()
    let lastIndex = 0

    for (const m of filtered) {
      if (m.start > lastIndex) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex, m.start)))
      }

      const span = doc.createElement('span')
      span.className = `user-highlight-${m.color}`
      span.textContent = text.slice(m.start, m.end)
      span.setAttribute('data-highlight-word', text.slice(m.start, m.end))
      fragment.appendChild(span)

      lastIndex = m.end
    }

    if (lastIndex < text.length) {
      fragment.appendChild(doc.createTextNode(text.slice(lastIndex)))
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
  }
}

/**
 * 在文档中应用 ADHD 句首渐变加粗 + 句尾蓝色渐变
 */
export function applyADHDSentenceBold(doc: Document): void {
  const body = doc.body
  if (!body) return

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text)) {
    if (node.textContent && node.textContent.trim().length > 0) {
      const parent = node.parentElement
      if (parent && parent.className && (
        parent.className.includes('adhd-head-') ||
        parent.className.includes('adhd-tail-')
      )) {
        continue
      }
      textNodes.push(node)
    }
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || ''
    if (text.trim().length < 2) continue

    // 将文本切分为句子，保留分隔符
    // 匹配中文句号、感叹号、问号以及英文句号、感叹号、问号
    const sentences: { text: string; start: number }[] = []
    const sentenceSplitRegex = /[。！？!?.]+/g
    let lastIdx = 0
    let splitMatch: RegExpExecArray | null

    while ((splitMatch = sentenceSplitRegex.exec(text)) !== null) {
      const sentenceEnd = splitMatch.index + splitMatch[0].length
      sentences.push({ text: text.slice(lastIdx, sentenceEnd), start: lastIdx })
      lastIdx = sentenceEnd
    }
    // 最后剩余的部分也算一句
    if (lastIdx < text.length) {
      sentences.push({ text: text.slice(lastIdx), start: lastIdx })
    }

    if (sentences.length === 0) continue

    // 对每个句子计算需要标记的字符位置
    const marks: { start: number; end: number; cls: string }[] = []

    for (const sentence of sentences) {
      const s = sentence.text
      // 提取有效字符（中文字/英文字母/数字）的位置
      const charPositions: number[] = []
      for (let i = 0; i < s.length; i++) {
        if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(s[i])) {
          charPositions.push(i)
        }
      }
      if (charPositions.length < 3) continue

      const headCount = Math.min(5, charPositions.length)
      const tailCount = Math.min(5, charPositions.length - headCount) // 确保不与句首重叠

      // 句首渐变加粗（从最粗到正常）
      for (let i = 0; i < headCount; i++) {
        const pos = charPositions[i]
        marks.push({
          start: sentence.start + pos,
          end: sentence.start + pos + 1,
          cls: `adhd-head-${i + 1}`,
        })
      }

      // 句尾蓝色渐变（从浅到深）
      if (tailCount > 0) {
        const tailStart = charPositions.length - tailCount
        for (let i = 0; i < tailCount; i++) {
          const pos = charPositions[tailStart + i]
          // 确保不与句首标记重叠
          const globalPos = sentence.start + pos
          const overlaps = marks.some(m => m.start === globalPos && m.cls.startsWith('adhd-head-'))
          if (!overlaps) {
            marks.push({
              start: globalPos,
              end: globalPos + 1,
              cls: `adhd-tail-${i + 1}`,
            })
          }
        }
      }
    }

    if (marks.length === 0) continue

    // 按位置排序
    marks.sort((a, b) => a.start - b.start)

    // 去重（同位置优先句首）
    const filtered: typeof marks = []
    for (const m of marks) {
      if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) {
        filtered.push(m)
      }
    }

    // 构建 DOM 片段
    const fragment = doc.createDocumentFragment()
    let lastIndex = 0

    for (const m of filtered) {
      if (m.start > lastIndex) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex, m.start)))
      }

      const span = doc.createElement('span')
      span.className = m.cls
      span.textContent = text.slice(m.start, m.end)
      fragment.appendChild(span)

      lastIndex = m.end
    }

    if (lastIndex < text.length) {
      fragment.appendChild(doc.createTextNode(text.slice(lastIndex)))
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
  }
}

/**
 * localStorage 存储 key 前缀
 */
const STORAGE_KEY_PREFIX = 'epub-highlight-words-'

/**
 * 获取指定书籍的存储 key
 */
function getStorageKey(bookId?: string): string {
  return bookId ? `${STORAGE_KEY_PREFIX}${bookId}` : 'epub-highlight-words'
}

/**
 * 从 localStorage 加载高亮词（按书籍）
 */
export function loadHighlightWords(bookId?: string): HighlightWord[] {
  try {
    const key = getStorageKey(bookId)
    const data = localStorage.getItem(key)
    if (data) {
      return JSON.parse(data)
    }
    // 兼容旧版全局存储：如果按书籍找不到，尝试从全局迁移
    if (bookId) {
      const globalData = localStorage.getItem('epub-highlight-words')
      if (globalData) {
        const words = JSON.parse(globalData)
        if (words.length > 0) {
          // 迁移到新的按书籍存储
          localStorage.setItem(key, globalData)
          return words
        }
      }
    }
  } catch (e) {
    console.warn('加载高亮词失败:', e)
  }
  return []
}

/**
 * 保存高亮词到 localStorage（按书籍）
 */
export function saveHighlightWords(words: HighlightWord[], bookId?: string): void {
  try {
    const key = getStorageKey(bookId)
    localStorage.setItem(key, JSON.stringify(words))
  } catch (e) {
    console.warn('保存高亮词失败:', e)
  }
}

/**
 * 导出高亮词为 JSON 字符串
 */
export function exportHighlightWords(words: HighlightWord[], bookTitle: string): string {
  return JSON.stringify({
    version: 1,
    bookTitle,
    exportTime: new Date().toISOString(),
    words,
  }, null, 2)
}

/**
 * 从 JSON 字符串导入高亮词
 */
export function importHighlightWords(jsonStr: string): HighlightWord[] | null {
  try {
    const data = JSON.parse(jsonStr)
    if (data && Array.isArray(data.words)) {
      return data.words.filter((w: any) => w.text && w.color)
    }
    // 兼容直接数组格式
    if (Array.isArray(data)) {
      return data.filter((w: any) => w.text && w.color)
    }
  } catch (e) {
    console.warn('导入高亮词失败:', e)
  }
  return null
}

/**
 * 阅读时间 localStorage key 前缀
 */
const READING_TIME_KEY_PREFIX = 'epub-reading-time-'

/**
 * 加载指定书籍的累计阅读时间（秒）
 */
export function loadReadingTime(bookId: string): number {
  try {
    const data = localStorage.getItem(`${READING_TIME_KEY_PREFIX}${bookId}`)
    if (data) {
      const seconds = parseInt(data, 10)
      return isNaN(seconds) ? 0 : seconds
    }
  } catch (e) {
    console.warn('加载阅读时间失败:', e)
  }
  return 0
}

/**
 * 保存指定书籍的累计阅读时间（秒）
 */
export function saveReadingTime(bookId: string, seconds: number): void {
  try {
    localStorage.setItem(`${READING_TIME_KEY_PREFIX}${bookId}`, String(Math.floor(seconds)))
  } catch (e) {
    console.warn('保存阅读时间失败:', e)
  }
}

/**
 * 清除文档中所有自定义高亮和 ADHD 标记，恢复原始文本节点
 * 优化：合并为一次 querySelectorAll，批量替换后只 normalize 一次
 */
export function clearAllEffects(doc: Document): void {
  const body = doc.body
  if (!body) return

  // 一次性查询所有需要清除的 span（高亮 + ADHD 句首/句尾 + 旧版 bold）
  const allSpans = body.querySelectorAll(
    '[class^="user-highlight-"], [class^="adhd-head-"], [class^="adhd-tail-"], .adhd-bold'
  )

  // 批量替换为文本节点，不在循环中 normalize
  allSpans.forEach((span) => {
    const parent = span.parentNode
    if (parent) {
      const textNode = doc.createTextNode(span.textContent || '')
      parent.replaceChild(textNode, span)
    }
  })

  // 清除 ADHD line overlay
  const overlay = doc.getElementById('adhd-line-overlay')
  if (overlay) overlay.remove()

  // 清除 ADHD spacing class
  body.classList.remove('adhd-spacing')

  // 清除 ADHD line-spacing-enhance class
  body.classList.remove('adhd-line-spacing-enhance')

  // 最终只做一次 normalize，合并所有相邻的文本节点
  body.normalize()
}

// ============== 书签功能 ==============

const BOOKMARKS_KEY_PREFIX = 'epub_bookmarks_'

/**
 * 书签条目
 */
export interface Bookmark {
  id: string       // 唯一 ID
  cfi: string      // EPUB CFI 定位
  chapter: string  // 章节标题
  text: string     // 书签处的文本摘要（前30字）
  progress: number // 全书进度百分比
  createdAt: number // 创建时间戳
}

/**
 * 从 localStorage 读取书签列表
 */
export function loadBookmarks(bookId: string): Bookmark[] {
  try {
    const raw = localStorage.getItem(`${BOOKMARKS_KEY_PREFIX}${bookId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('读取书签失败:', e)
  }
  return []
}

/**
 * 保存书签列表到 localStorage
 */
export function saveBookmarks(bookmarks: Bookmark[], bookId: string): void {
  try {
    localStorage.setItem(`${BOOKMARKS_KEY_PREFIX}${bookId}`, JSON.stringify(bookmarks))
  } catch (e) {
    console.warn('保存书签失败:', e)
  }
}
