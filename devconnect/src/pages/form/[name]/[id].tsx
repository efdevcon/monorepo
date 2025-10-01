'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

// Dynamic field interface based on API response
interface DynamicField {
  name: string
  value: string
  type: 'text' | 'email' | 'file' | 'url' | 'title' | 'select' | 'status' | 'checkbox' | 'formula' | 'rollup' | 'quests'
  mode: 'edit' | 'read'
  description?: string
  options?: Array<{ name: string; color?: string }>
}

// Config interface for API response
interface ConfigResponse {
  fields: DynamicField[]
  config: {
    isLocked: boolean
    isOk?: boolean
  }
  descriptionLinks?: Record<string, string>
}

// Sub-item interface for org forms
interface SubItem {
  id: string
  name?: string
  completionPercentage: number
  accreditationType: string
  reviewStatus: string
  claimStatus: string
}

// Notification interface
interface Notification {
  id: string
  type: 'success' | 'error'
  message: string
}

// File upload state interface
interface FileUploadState {
  [fieldName: string]: {
    file: File | null
    preview: string | null
    isDragOver: boolean
  }
}

export default function UpdatePage({ params }: { params?: { name: string; id: string } }) {
  const router = useRouter()
  const [data, setData] = useState<Record<string, string>>({})
  const [fields, setFields] = useState<DynamicField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [fileUploads, setFileUploads] = useState<FileUploadState>({})
  const [subItems, setSubItems] = useState<SubItem[]>([])
  const [subItemsLoading, setSubItemsLoading] = useState(false)
  const [orgPageName, setOrgPageName] = useState<string>('')
  const [isLocked, setIsLocked] = useState(false)
  const [isOk, setIsOk] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [orgDescriptionLinks, setOrgDescriptionLinks] = useState<Record<string, string>>({})
  const [descriptionLinks, setDescriptionLinks] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Get params from either props or router query
  const pageParams = params || router.query
  const pageId = pageParams?.id as string
  const pageName = pageParams?.name as string

  // Add notification function
  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString()
    const notification: Notification = { id, type, message }
    setNotifications(prev => [...prev, notification])

    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  // Handle select option change
  const handleSelectChange = (fieldName: string, value: string) => {
    setSelectedValues(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  // Initialize file upload state for file fields
  const initializeFileUploads = (fields: DynamicField[]) => {
    const uploads: FileUploadState = {}
    fields.forEach(field => {
      if (field.type === 'file' && field.mode === 'edit') {
        console.log('Initializing file upload for field:', field.name, 'with value:', field.value)
        uploads[field.name] = {
          file: null,
          preview: field.value || null,
          isDragOver: false,
        }
      }
    })
    console.log('File uploads initialized:', uploads)
    setFileUploads(uploads)
  }

  // Helper function to check if a URL is an image
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const lowerUrl = url.toLowerCase()

    // First check if it's a PDF (PDFs should not be treated as images)
    if (lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf')) {
      return false
    }

    const isImage = imageExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('image/')

    console.log('isImageUrl check:', { url, lowerUrl, isImage })
    return isImage
  }

  // Helper function to check if a URL is a PDF
  const isPdfUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase()
    return lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf')
  }

  // Helper function to get file name from URL
  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const fileName = pathname.split('/').pop() || 'File'
      return decodeURIComponent(fileName)
    } catch {
      return 'File'
    }
  }

  // Helper function to render description with links
  const renderDescriptionWithLinks = (description: string) => {
    if (!description || !descriptionLinks) return description

    let result = description
    const linkKeys = Object.keys(descriptionLinks)

    // Replace each link pattern with actual links
    linkKeys.forEach(linkText => {
      const linkUrl = descriptionLinks[linkText]
      if (linkUrl && result.includes(linkText)) {
        const linkElement = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline; font-weight: 500;">${linkText}</a>`
        result = result.replace(linkText, linkElement)
      }
    })

    return result
  }

  // Handle file selection
  const handleFileSelect = (fieldName: string, file: File) => {
    if (!file) return

    // Validate file type (images, PDFs, etc.)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
    if (!validTypes.includes(file.type)) {
      addNotification('error', 'Please select a valid file type (image, PDF, or text)')
      return
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      addNotification('error', 'File size must be less than 20MB')
      return
    }

    // Create preview for images and PDFs
    let preview: string | null = null
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      preview = URL.createObjectURL(file)
    }

    setFileUploads(prev => ({
      ...prev,
      [fieldName]: {
        file,
        preview,
        isDragOver: false,
      },
    }))
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isDragOver: true },
    }))
  }

  const handleDragLeave = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isDragOver: false },
    }))
  }

  const handleDrop = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isDragOver: false },
    }))

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(fieldName, files[0])
    }
  }

  // Function to fetch sub-items (accreditation pages for org forms)
  const fetchSubItems = async () => {
    if (pageName !== 'org') return

    setSubItemsLoading(true)
    try {
      const res = await fetch(`/api/notion/organization/${pageId}`)

      if (!res.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to fetch organization data'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = res.statusText || errorMessage
        }
        setError(errorMessage)
        setSubItems([])
        setOrgPageName('')
        return
      }

      const responseData = await res.json()
      setSubItems(responseData.children || [])
      setOrgPageName(responseData.orgName || '')

      // Set description links from API response
      setOrgDescriptionLinks(responseData.descriptionLinks || {})
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading organization data'
      setError(errorMessage)
      setSubItems([])
      setOrgPageName('')
    } finally {
      setSubItemsLoading(false)
    }
  }

  // Function to fetch data
  const fetchData = async () => {
    // Skip main API call for org pages
    if (pageName === 'org') {
      setFields([])
      setData({})
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/notion/${pageId}${pageName === 'supporter' ? '?supporter=true' : ''}`)
      if (!res.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to fetch data'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      const responseData: ConfigResponse = await res.json()

      // Handle new flat array API response format
      const apiFields = responseData.fields || []

      // Set locked status from config
      setIsLocked(responseData.config?.isLocked || false)
      setIsOk(responseData.config?.isOk || false)

      // Set description links from API response
      setDescriptionLinks(responseData.descriptionLinks || {})

      // Convert to data object for backward compatibility
      const allData: Record<string, string> = {}
      apiFields.forEach((field: any) => {
        allData[field.name] = field.value
      })
      setData(allData)

      // Convert to dynamic fields (already sorted by order from backend)
      const dynamicFields: DynamicField[] = apiFields.map((field: any) => ({
        name: field.name,
        value: field.value,
        type: field.type,
        mode: field.mode,
        description: field.description,
        options: field.options,
      }))

      setFields(dynamicFields)
      initializeFileUploads(dynamicFields)

      // Initialize selected values for select fields
      const initialSelectedValues: Record<string, string> = {}
      dynamicFields.forEach(field => {
        if (field.type === 'select') {
          initialSelectedValues[field.name] = field.value
        }
      })
      setSelectedValues(initialSelectedValues)

      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading data'
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Debug select fields
  useEffect(() => {
    const selectFields = fields.filter(field => field.type === 'select')
    if (selectFields.length > 0) {
      console.log('Select fields found:', selectFields)
      selectFields.forEach(field => {
        console.log('Select field debug:', {
          fieldName: field.name,
          fieldType: field.type,
          options: field.options,
          selectedValue: selectedValues[field.name],
        })
      })
    }
  }, [fields, selectedValues])

  // Fetch initial page data
  useEffect(() => {
    // Wait for router to be ready
    if (!router.isReady) {
      return
    }

    if (!pageId) {
      setError('Invalid page ID')
      setLoading(false)
      return
    }

    fetchData()

    // If this is an org form, also fetch sub-items
    if (pageName === 'org') {
      fetchSubItems()
    }
  }, [pageId, pageName, params, router.query, router.isReady])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    if (!pageId) {
      addNotification('error', 'Invalid page ID')
      setIsSubmitting(false)
      return
    }

    // Prevent submission if form is locked
    if (isLocked) {
      addNotification('error', 'Form is locked and cannot be updated')
      setIsSubmitting(false)
      return
    }

    const updates: Record<string, string> = {}

    // Process each field
    for (const field of fields) {
      if (field.mode === 'edit') {
        if (field.type === 'file') {
          // Handle file upload
          const fileUpload = fileUploads[field.name]
          if (fileUpload?.file) {
            try {
              // Convert file to base64
              const reader = new FileReader()
              const fileData = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(fileUpload.file!)
              })

              // Upload file to API
              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file: fileData,
                  fileName: fileUpload.file.name,
                  contentType: fileUpload.file.type,
                }),
              })

              if (!uploadRes.ok) {
                throw new Error('Failed to upload file')
              }

              const uploadData = await uploadRes.json()
              updates[field.name] = uploadData.url
            } catch (error) {
              addNotification('error', `Failed to upload ${field.name}: ${error}`)
              setIsSubmitting(false)
              return
            }
          } else {
            // Use existing value or empty string
            updates[field.name] = fileUpload?.preview || ''
          }
        } else {
          // Handle regular fields
          if (field.type === 'checkbox') {
            // For checkboxes, check if the checkbox is checked
            const isChecked = formData.get(field.name) === 'on'
            updates[field.name] = isChecked ? 'true' : 'false'
          } else if (field.type === 'select') {
            // For select fields, use the selected value from state
            console.log(`Select field ${field.name} selected value:`, selectedValues[field.name])
            updates[field.name] = selectedValues[field.name] || ''
          } else {
            const value = formData.get(field.name) as string
            updates[field.name] = value || ''
          }
        }
      }
    }

    try {
      console.log('Submitting updates:', updates)
      const res = await fetch(`/api/notion/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to update'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }
      addNotification('success', 'Form updated successfully!')

      // Refetch data to show updated values
      await fetchData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating page. Please try again.'
      addNotification('error', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          color: '#666',
        }}
      >
        Loading...
      </div>
    )

  if (error)
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          color: '#e74c3c',
        }}
      >
        {error}
      </div>
    )

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Notifications */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              backgroundColor: notification.type === 'success' ? '#d4edda' : '#f8d7da',
              color: notification.type === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${notification.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              animation: 'slideIn 0.3s ease-out',
              maxWidth: '300px',
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #f0f0f0',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: '#333',
            margin: '0 0 0.5rem 0',
            textTransform: 'capitalize',
          }}
        >
          {pageName === 'org' ? orgPageName || pageName : pageName}
        </h1>
        <p
          style={{
            color: '#666',
            margin: '0',
            fontSize: '1rem',
          }}
        >
          {pageName === 'org'
            ? 'Accreditation links for your organization'
            : isLocked
            ? 'Form is locked 🔒 - view only'
            : fields.filter(field => field.mode === 'edit').some(field => field.value && field.value.trim() !== '')
            ? 'Update your information'
            : 'Submit your information'}
        </p>
      </div>

      {/* Form */}
      {pageName !== 'org' && (
        <>
          {/* Locked Form Message */}
          {isLocked && (
            <div
              style={{
                backgroundColor: isOk ? '#d4edda' : '#fff3cd',
                border: `1px solid ${isOk ? '#c3e6cb' : '#ffeaa7'}`,
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{isOk ? '✅' : '🔒'}</div>
              <p
                style={{
                  margin: '0',
                  fontSize: '1rem',
                  color: isOk ? '#155724' : '#856404',
                  fontWeight: '500',
                }}
              >
                {isOk ? 'Accreditation claimed' : 'This form is currently locked and cannot be updated.'}
              </p>
              <p
                style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.9rem',
                  color: isOk ? '#155724' : '#856404',
                }}
              >
                {isOk ? '' : 'All fields are now read-only.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            {fields.map(field => {
              console.log('Rendering field:', {
                name: field.name,
                type: field.type,
                mode: field.mode,
                hasOptions: !!field.options,
              })
              return (
                <div key={field.name} style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor={field.name}
                    style={{
                      display: 'block',
                      marginBottom: '0.75rem',
                      fontWeight: field.mode === 'read' ? '600' : '500',
                      color: field.mode === 'read' ? '#495057' : '#333',
                      fontSize: '1rem',
                      position: 'relative',
                    }}
                  >
                    {field.mode === 'read' ? (
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginRight: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        📖 Read Only
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginRight: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        ✏️ Editable
                      </span>
                    )}
                    {field.name}
                  </label>
                  {field.description && (
                    <p
                      style={{
                        fontSize: '1rem',
                        color: '#666',
                        margin: '0 0 0.5rem 0',
                        fontStyle: 'italic',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderDescriptionWithLinks(field.description),
                      }}
                    />
                  )}
                  {field.mode === 'read' ? (
                    // Read-only display
                    <div
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: '#f8f9fa',
                        color: '#495057',
                        minHeight: '3rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        position: 'relative',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {field.type === 'file' && field.value ? (
                        <div style={{ width: '100%' }}>
                          {isImageUrl(field.value) ? (
                            <img
                              src={field.value}
                              alt="File preview"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                              }}
                            />
                          ) : isPdfUrl(field.value) ? (
                            <div
                              style={{
                                width: '100%',
                                height: '300px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                                overflow: 'hidden',
                              }}
                            >
                              <iframe
                                src={`${field.value}#toolbar=0&navpanes=0&scrollbar=0`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                }}
                                title="PDF Preview"
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '1rem',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                              }}
                            >
                              📄 {getFileNameFromUrl(field.value)}
                            </div>
                          )}
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                              }}
                              onClick={e => e.stopPropagation()}
                              onMouseEnter={e => {
                                e.currentTarget.style.textDecoration = 'underline'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.textDecoration = 'none'
                              }}
                            >
                              📎 {getFileNameFromUrl(field.value)}
                            </a>
                          </p>
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>{field.value === 'true' ? '✅' : '☐'}</span>
                          <span style={{ fontSize: '0.9rem', color: '#666' }}>
                            {field.value === 'true' ? 'Yes' : 'No'}
                          </span>
                        </div>
                      ) : field.type === 'select' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#e9ecef',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color: '#333',
                            }}
                          >
                            {field.value || 'No selection'}
                          </span>
                        </div>
                      ) : field.type === 'rollup' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#e7f3ff',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color: '#0066cc',
                            }}
                          >
                            {field.value || 'No data'}
                          </span>
                        </div>
                      ) : field.type === 'quests' ? (
                        <div style={{ width: '100%' }}>
                          {field.value ? (
                            <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                              {field.value.split(',').map((questId, index) => (
                                <li key={questId} style={{ marginBottom: '0.5rem' }}>
                                  <a
                                    href={`/form/quest/${questId.trim()}`}
                                    target="_blank"
                                    style={{
                                      color: '#007bff',
                                      textDecoration: 'none',
                                      fontSize: '0.9rem',
                                      fontWeight: '500',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    {/* <span style={{ fontSize: '1rem' }}>-</span> */}
                                    {/* Quest {index + 1} */}
                                    Quest form
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#666', fontStyle: 'italic' }}>No quests available</span>
                          )}
                        </div>
                      ) : field.type === 'url' ? (
                        <div style={{ width: '100%' }}>
                          {field.value ? (
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                                fontSize: '1rem',
                                fontWeight: '500',
                                wordBreak: 'break-all',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.textDecoration = 'underline'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.textDecoration = 'none'
                              }}
                            >
                              {field.value}
                            </a>
                          ) : (
                            <span style={{ color: '#666', fontStyle: 'italic' }}>No URL provided</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{field.value}</div>
                      )}
                    </div>
                  ) : field.type === 'file' ? (
                    // File upload with drag and drop
                    <div>
                      <div
                        style={{
                          width: '100%',
                          padding: '1.5rem',
                          border: `3px dashed ${fileUploads[field.name]?.isDragOver ? '#0056b3' : '#007bff'}`,
                          borderRadius: '12px',
                          backgroundColor: fileUploads[field.name]?.isDragOver ? '#e3f2fd' : '#f8f9ff',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          minHeight: '140px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: fileUploads[field.name]?.isDragOver
                            ? '0 4px 12px rgba(0,123,255,0.3)'
                            : '0 2px 8px rgba(0,123,255,0.1)',
                        }}
                        onDragOver={e => handleDragOver(e, field.name)}
                        onDragLeave={e => handleDragLeave(e, field.name)}
                        onDrop={e => handleDrop(e, field.name)}
                        onClick={() => fileInputRefs.current[field.name]?.click()}
                      >
                        {fileUploads[field.name]?.preview ? (
                          // Show preview
                          <div style={{ width: '100%' }}>
                            {(() => {
                              const preview = fileUploads[field.name]?.preview
                              const isImage = preview && isImageUrl(preview)
                              const isBlob = preview?.startsWith('blob:')
                              console.log('Preview rendering for field:', field.name, { preview, isImage, isBlob })

                              // For blob URLs (new uploads), show the blob preview
                              if (isBlob && fileUploads[field.name]?.file && preview) {
                                const file = fileUploads[field.name].file
                                if (file?.type.startsWith('image/')) {
                                  return (
                                    <img
                                      src={preview}
                                      alt="Preview"
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        borderRadius: '4px',
                                        marginBottom: '0.5rem',
                                      }}
                                    />
                                  )
                                } else if (file?.type === 'application/pdf') {
                                  return (
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '300px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        marginBottom: '0.5rem',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <iframe
                                        src={`${preview}#toolbar=0&navpanes=0&scrollbar=0`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          border: 'none',
                                        }}
                                        title="PDF Preview"
                                      />
                                    </div>
                                  )
                                }
                              }

                              // For existing file URLs, show the actual file
                              if (isImage && preview) {
                                return (
                                  <img
                                    src={preview}
                                    alt="Preview"
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '200px',
                                      borderRadius: '4px',
                                      marginBottom: '0.5rem',
                                    }}
                                  />
                                )
                              }

                              // For PDF files, show PDF preview
                              if (isPdfUrl(preview!)) {
                                return (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '300px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      marginBottom: '0.5rem',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <iframe
                                      src={`${preview}#toolbar=0&navpanes=0&scrollbar=0`}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                      }}
                                      title="PDF Preview"
                                    />
                                  </div>
                                )
                              }

                              // For other files, show file icon
                              return (
                                <div
                                  style={{
                                    padding: '1rem',
                                    backgroundColor: '#e9ecef',
                                    borderRadius: '4px',
                                    marginBottom: '0.5rem',
                                  }}
                                >
                                  📄 {preview ? getFileNameFromUrl(preview) : 'File'}
                                </div>
                              )
                            })()}
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                              Click or drag to replace
                            </p>
                          </div>
                        ) : (
                          // Show upload prompt
                          <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                            <p style={{ margin: '0', fontSize: '1rem', color: '#666' }}>
                              Drag and drop a file here, or click to select
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                              Supports: Images, PDFs, Text files (max 20MB)
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={el => {
                          fileInputRefs.current[field.name] = el
                        }}
                        type="file"
                        accept="image/*,.pdf,.txt"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(field.name, file)
                        }}
                      />
                      {fileUploads[field.name]?.file && (
                        <button
                          type="button"
                          onClick={() => {
                            setFileUploads(prev => ({
                              ...prev,
                              [field.name]: { file: null, preview: null, isDragOver: false },
                            }))
                          }}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Remove file
                        </button>
                      )}
                      {/* File link outside the draggable area */}
                      {fileUploads[field.name]?.preview && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a
                            href={fileUploads[field.name].preview!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#007bff',
                              textDecoration: 'none',
                              fontSize: '0.9rem',
                            }}
                            onClick={e => e.stopPropagation()}
                            onMouseEnter={e => {
                              e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.textDecoration = 'none'
                            }}
                          >
                            📎 {getFileNameFromUrl(fileUploads[field.name].preview!)}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : field.type === 'text' ? (
                    // Textarea for text fields
                    <textarea
                      id={field.name}
                      name={field.name}
                      defaultValue={field.value || ''}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px solid #007bff',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        minHeight: '120px',
                        backgroundColor: '#f8f9ff',
                        boxShadow: '0 2px 4px rgba(0,123,255,0.1)',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#0056b3'
                        e.target.style.backgroundColor = '#ffffff'
                        e.target.style.boxShadow = '0 4px 8px rgba(0,123,255,0.2)'
                        e.target.style.outline = 'none'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#007bff'
                        e.target.style.backgroundColor = '#f8f9ff'
                        e.target.style.boxShadow = '0 2px 4px rgba(0,123,255,0.1)'
                      }}
                    />
                  ) : field.type === 'checkbox' ? (
                    // Checkbox input
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        id={field.name}
                        name={field.name}
                        type="checkbox"
                        defaultChecked={field.value === 'true'}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#007bff',
                          transform: 'scale(1.1)',
                        }}
                      />
                      <label
                        htmlFor={field.name}
                        style={{
                          fontSize: '1rem',
                          color: '#333',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontWeight: '500',
                        }}
                      >
                        {field.description || 'Check to confirm'}
                      </label>
                    </div>
                  ) : field.type === 'select' ? (
                    // Select field with button options
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {/* Temporary fallback options for testing */}
                        {(!field.options || field.options.length === 0) && (
                          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem', width: '100%' }}>
                            No options available for this select field. Using test options:
                          </div>
                        )}
                        {(field.options && field.options.length > 0
                          ? field.options
                          : [
                              { name: 'Option 1', color: 'default' },
                              { name: 'Option 2', color: 'default' },
                              { name: 'Option 3', color: 'default' },
                            ]
                        ).map(option => {
                          const isSelected = selectedValues[field.name] === option.name
                          return (
                            <button
                              key={option.name}
                              type="button"
                              onClick={() => handleSelectChange(field.name, option.name)}
                              style={{
                                padding: '0.75rem 1.5rem',
                                border: `2px solid ${isSelected ? '#007bff' : '#ddd'}`,
                                borderRadius: '6px',
                                backgroundColor: isSelected ? '#007bff' : 'white',
                                color: isSelected ? 'white' : '#333',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                minWidth: '100px',
                                textAlign: 'center',
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#007bff'
                                  e.currentTarget.style.backgroundColor = '#f0f8ff'
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#ddd'
                                  e.currentTarget.style.backgroundColor = 'white'
                                }
                              }}
                            >
                              {option.name}
                            </button>
                          )
                        })}
                      </div>
                      {/* Clear selection button */}
                      {selectedValues[field.name] && (
                        <button
                          type="button"
                          onClick={() => handleSelectChange(field.name, '')}
                          style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #dc3545',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                            color: '#dc3545',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#dc3545'
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.color = '#dc3545'
                          }}
                        >
                          ✕ Clear selection
                        </button>
                      )}
                    </div>
                  ) : (
                    // Regular input field for other types
                    <input
                      id={field.name}
                      name={field.name}
                      type={(() => {
                        const fieldType = field.type as
                          | 'text'
                          | 'email'
                          | 'file'
                          | 'url'
                          | 'title'
                          | 'formula'
                          | 'quests'
                        switch (fieldType) {
                          case 'file':
                            return 'url'
                          case 'email':
                            return 'email'
                          case 'url':
                            return 'url'
                          case 'title':
                          case 'formula':
                          case 'quests':
                          default:
                            return 'text'
                        }
                      })()}
                      defaultValue={field.value || ''}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px solid #007bff',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#f8f9ff',
                        boxShadow: '0 2px 4px rgba(0,123,255,0.1)',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#0056b3'
                        e.target.style.backgroundColor = '#ffffff'
                        e.target.style.boxShadow = '0 4px 8px rgba(0,123,255,0.2)'
                        e.target.style.outline = 'none'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#007bff'
                        e.target.style.backgroundColor = '#f8f9ff'
                        e.target.style.boxShadow = '0 2px 4px rgba(0,123,255,0.1)'
                      }}
                    />
                  )}
                </div>
              )
            })}

            {/* Submit Button - Only show if form is not locked */}
            {!isLocked && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 2rem',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    minWidth: '120px',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isSubmitting) {
                      ;(e.target as HTMLButtonElement).style.backgroundColor = '#0056b3'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSubmitting) {
                      ;(e.target as HTMLButtonElement).style.backgroundColor = '#007bff'
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : fields
                        .filter(field => field.mode === 'edit')
                        .some(field => field.value && field.value.trim() !== '')
                    ? 'Update'
                    : 'Submit'}
                </button>
              </div>
            )}
          </form>
        </>
      )}

      {/* Read-only Information Display for Org Forms */}
      {pageName === 'org' && (
        <div style={{ marginBottom: '2rem' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <tbody>
              {fields
                .filter(field => field.mode === 'read')
                .map(field => (
                  <tr key={field.name} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td
                      style={{
                        padding: '1rem',
                        fontWeight: '500',
                        color: '#333',
                        backgroundColor: '#f8f9fa',
                        width: '30%',
                        verticalAlign: 'top',
                        borderRight: '1px solid #e9ecef',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.name}
                      {field.description && (
                        <div
                          style={{
                            fontSize: '1rem',
                            color: '#666',
                            marginTop: '0.25rem',
                            fontStyle: 'italic',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: renderDescriptionWithLinks(field.description),
                          }}
                        />
                      )}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: '#666',
                        verticalAlign: 'top',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.type === 'file' && field.value ? (
                        <div style={{ width: '100%' }}>
                          {isImageUrl(field.value) ? (
                            <img
                              src={field.value}
                              alt="File preview"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                              }}
                            />
                          ) : isPdfUrl(field.value) ? (
                            <div
                              style={{
                                width: '100%',
                                height: '300px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                                overflow: 'hidden',
                              }}
                            >
                              <iframe
                                src={`${field.value}#toolbar=0&navpanes=0&scrollbar=0`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                }}
                                title="PDF Preview"
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '1rem',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                              }}
                            >
                              📄 {getFileNameFromUrl(field.value)}
                            </div>
                          )}
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                              }}
                              onClick={e => e.stopPropagation()}
                              onMouseEnter={e => {
                                e.currentTarget.style.textDecoration = 'underline'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.textDecoration = 'none'
                              }}
                            >
                              📎 {getFileNameFromUrl(field.value)}
                            </a>
                          </p>
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>{field.value === 'true' ? '✅' : '☐'}</span>
                          <span style={{ fontSize: '0.9rem', color: '#666' }}>
                            {field.value === 'true' ? 'Yes' : 'No'}
                          </span>
                        </div>
                      ) : field.type === 'select' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#e9ecef',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color: '#333',
                            }}
                          >
                            {field.value || 'No selection'}
                          </span>
                        </div>
                      ) : field.type === 'rollup' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#e7f3ff',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color: '#0066cc',
                            }}
                          >
                            {field.value || 'No data'}
                          </span>
                        </div>
                      ) : field.type === 'quests' ? (
                        <div style={{ width: '100%' }}>
                          {field.value ? (
                            <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                              {field.value.split(',').map((questId, index) => (
                                <li key={questId} style={{ marginBottom: '0.5rem' }}>
                                  <a
                                    href={`/form/quest/${questId.trim()}`}
                                    target="_blank"
                                    style={{
                                      color: '#007bff',
                                      textDecoration: 'none',
                                      fontSize: '0.9rem',
                                      fontWeight: '500',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    {/* <span style={{ fontSize: '1rem' }}>-</span> */}
                                    {/* Quest {index + 1} */}
                                    Quest form
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#666', fontStyle: 'italic' }}>No quests available</span>
                          )}
                        </div>
                      ) : field.type === 'url' ? (
                        <div style={{ width: '100%' }}>
                          {field.value ? (
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                wordBreak: 'break-all',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.textDecoration = 'underline'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.textDecoration = 'none'
                              }}
                            >
                              {field.value}
                            </a>
                          ) : (
                            <span style={{ color: '#666', fontStyle: 'italic' }}>No URL provided</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{field.value || 'No value'}</div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-items Section for Org Forms */}
      {pageName === 'org' && (
        <div>
          {subItemsLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
                fontSize: '1rem',
              }}
            >
              Loading...
            </div>
          ) : subItems.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#333',
                        borderBottom: '2px solid #e9ecef',
                        fontSize: '0.9rem',
                      }}
                    >
                      Accreditation
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderBottom: '2px solid #e9ecef',
                        fontSize: '0.9rem',
                      }}
                    >
                      Completion
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderBottom: '2px solid #e9ecef',
                        fontSize: '0.9rem',
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderBottom: '2px solid #e9ecef',
                        fontSize: '0.9rem',
                      }}
                    >
                      Review Status
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#333',
                        borderBottom: '2px solid #e9ecef',
                        fontSize: '0.9rem',
                      }}
                    >
                      Claim Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subItems.map((item: SubItem, index: number) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #e9ecef',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <td
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #e9ecef',
                        }}
                      >
                        <a
                          href={`/form/accreditation/${item.id}`}
                          target="_blank"
                          style={{
                            color: '#007bff',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.textDecoration = 'underline'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.textDecoration = 'none'
                          }}
                        >
                          {`${index + 1}. ${item.name || `Accreditation`}`}
                        </a>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid #e9ecef',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              width: '60px',
                              height: '8px',
                              backgroundColor: '#e9ecef',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${item.completionPercentage}%`,
                                height: '100%',
                                backgroundColor:
                                  item.completionPercentage === 100
                                    ? '#28a745'
                                    : item.completionPercentage >= 50
                                    ? '#ffc107'
                                    : '#dc3545',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              color:
                                item.completionPercentage === 100
                                  ? '#28a745'
                                  : item.completionPercentage >= 50
                                  ? '#856404'
                                  : '#dc3545',
                            }}
                          >
                            {item.completionPercentage}%
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid #e9ecef',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            backgroundColor: item.accreditationType?.includes('Exhibitor')
                              ? '#e7f3ff'
                              : item.accreditationType?.includes('Not found')
                              ? '#ffe3ee'
                              : '#e9ecef',
                            color: item.accreditationType?.includes('Exhibitor')
                              ? '#0066cc'
                              : item.accreditationType?.includes('Not found')
                              ? '#dc3545'
                              : '#6c757d',
                          }}
                        >
                          {item.accreditationType || 'N/A'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid #e9ecef',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            backgroundColor: item.reviewStatus.includes('✅') ? '#d4edda' : '#e9ecef',
                            color: item.reviewStatus.includes('✅') ? '#155724' : '#6c757d',
                          }}
                        >
                          {item.reviewStatus}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid #e9ecef',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            backgroundColor: item.claimStatus.includes('✅') ? '#d4edda' : '#e9ecef',
                            color: item.claimStatus.includes('✅') ? '#155724' : '#6c757d',
                          }}
                        >
                          {item.claimStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
                fontSize: '1rem',
              }}
            >
              No accreditation pages found.
            </div>
          )}
        </div>
      )}

      {/* Accreditation Guide Link - Only show for accreditation pages with successful data load */}
      {pageName === 'accreditation' && descriptionLinks['attached insurance guide'] && fields.length > 0 && (
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem 0',
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#333',
            }}
          >
            Need Help with Insurance?
          </h3>
          <p
            style={{
              margin: '0 0 1.5rem 0',
              color: '#666',
              fontSize: '1rem',
            }}
          >
            Check out our accreditation insurance guide for detailed instructions and support.
          </p>
          <a
            href={descriptionLinks['attached insurance guide']}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#218838'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#28a745'
            }}
          >
            🛡️ View Insurance Guide
          </a>
        </div>
      )}

      {/* Help Links - Only show for org pages with successful data load */}
      {pageName === 'org' && Object.keys(orgDescriptionLinks).length > 0 && subItems.length > 0 && (
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem 0',
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#333',
            }}
          >
            Need Help?
          </h3>
          <p
            style={{
              margin: '0 0 1.5rem 0',
              color: '#666',
              fontSize: '1rem',
            }}
          >
            Check out our guides and resources for detailed instructions and support.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            {Object.entries(orgDescriptionLinks).map(
              ([linkText, linkUrl]) =>
                linkUrl && (
                  <a
                    key={linkText}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#0056b3'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#007bff'
                    }}
                  >
                    📖 {linkText}
                  </a>
                )
            )}
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
