export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) {
  if (data.length === 0) return

  const csvHeaders = headers || Object.keys(data[0])
  const csvRows = [
    csvHeaders.join(','),
    ...data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value
        })
        .join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function parseCSV<T extends Record<string, any>>(
  file: File,
  headers?: string[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter((line) => line.trim())
      
      if (lines.length === 0) {
        resolve([])
        return
      }

      const csvHeaders = headers || lines[0].split(',').map((h) => h.trim())
      const startIndex = headers ? 0 : 1
      
      const data = lines.slice(startIndex).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, any> = {}
        
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        return row as T
      })

      resolve(data)
    }
    
    reader.onerror = reject
    reader.readAsText(file)
  })
}

