import React, { useCallback, useRef, useState } from 'react'

interface FileUploaderProps {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.epub')) {
      alert('请选择 .epub 格式的文件')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        onFileLoaded(e.target.result, file.name)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [onFileLoaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.logoContainer}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="8" width="44" height="60" rx="4" stroke="#6366f1" strokeWidth="2.5" fill="none" />
            <rect x="24" y="12" width="44" height="60" rx="4" stroke="#6366f1" strokeWidth="2.5" fill="rgba(99,102,241,0.05)" />
            <line x1="32" y1="28" x2="58" y2="28" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="36" x2="54" y2="36" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="44" x2="56" y2="44" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="52" x2="50" y2="52" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
            <circle cx="38" cy="36" r="3" fill="#3b82f6" opacity="0.4" />
            <circle cx="48" cy="52" r="3" fill="#10b981" opacity="0.4" />
          </svg>
        </div>

        <h1 style={styles.title}>EPUB 智能高亮阅读器</h1>
        <p style={styles.subtitle}>
          自动识别并高亮
          <span style={styles.personTag}>人名</span> 和
          <span style={styles.placeTag}>地名</span>
          ，让阅读更有条理
        </p>

        <div
          style={{
            ...styles.dropZone,
            ...(isDragging ? styles.dropZoneActive : {}),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".epub"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />

          <div style={styles.uploadIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 32V16M24 16L18 22M24 16L30 22"
                stroke={isDragging ? '#6366f1' : '#999'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 32C8 36.4183 11.5817 40 16 40H32C36.4183 40 40 36.4183 40 32"
                stroke={isDragging ? '#6366f1' : '#999'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p style={styles.dropText}>
            {isDragging ? '松开以打开文件' : '拖拽 EPUB 文件到这里，或点击选择'}
          </p>
          <p style={styles.dropHint}>支持 .epub 格式电子书</p>
        </div>

        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📖</span>
            <span>EPUB 解析</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🧠</span>
            <span>智能识别</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🎨</span>
            <span>彩色高亮</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📑</span>
            <span>目录导航</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    background: 'linear-gradient(135deg, #faf8f5 0%, #f0eee8 100%)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 520,
    padding: '40px 32px',
    animation: 'fadeIn 0.6s ease-out',
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 36,
    textAlign: 'center',
    lineHeight: 1.8,
  },
  personTag: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
    color: '#2563eb',
    padding: '1px 8px',
    borderRadius: 4,
    borderBottom: '2px solid #3b82f6',
    fontWeight: 600,
    margin: '0 4px',
  },
  placeTag: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
    color: '#059669',
    padding: '1px 8px',
    borderRadius: 4,
    borderBottom: '2px solid #10b981',
    fontWeight: 600,
    margin: '0 4px',
  },
  dropZone: {
    width: '100%',
    padding: '48px 24px',
    border: '2px dashed #d4d0ca',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  dropZoneActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.04)',
    transform: 'scale(1.02)',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  dropText: {
    fontSize: 16,
    color: '#444',
    fontWeight: 500,
    marginBottom: 8,
  },
  dropHint: {
    fontSize: 13,
    color: '#999',
  },
  features: {
    display: 'flex',
    gap: 24,
    marginTop: 40,
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#666',
  },
  featureIcon: {
    fontSize: 24,
  },
}

export default FileUploader
