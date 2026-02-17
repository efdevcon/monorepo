export function flattenToText(content: Record<string, any>): string {
  const parts: string[] = []

  function walk(obj: any) {
    if (typeof obj === 'string') {
      parts.push(obj.replace(/<[^>]*>/g, ''))
    } else if (Array.isArray(obj)) {
      obj.forEach(walk)
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(walk)
    }
  }

  walk(content)
  return parts.join(' ')
}
