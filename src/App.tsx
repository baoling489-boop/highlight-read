import React, { useState, useCallback } from 'react'
import FileUploader from './components/FileUploader'
import EpubReader from './components/EpubReader'

interface BookData {
  data: ArrayBuffer
  fileName: string
}

const App: React.FC = () => {
  const [book, setBook] = useState<BookData | null>(null)

  const handleFileLoaded = useCallback((data: ArrayBuffer, fileName: string) => {
    setBook({ data, fileName })
  }, [])

  const handleBack = useCallback(() => {
    setBook(null)
  }, [])

  if (!book) {
    return <FileUploader onFileLoaded={handleFileLoaded} />
  }

  return (
    <EpubReader
      bookData={book.data}
      fileName={book.fileName}
      onBack={handleBack}
    />
  )
}

export default App
