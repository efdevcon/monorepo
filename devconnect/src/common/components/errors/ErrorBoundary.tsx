import React, { Component, ErrorInfo, ReactNode } from 'react'

interface DevconnectErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string // Optional name to identify which component had an error
  onError?: (error: Error, errorInfo: ErrorInfo) => void // Optional callback for error handling
}

interface DevconnectErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class DevconnectErrorBoundary extends Component<DevconnectErrorBoundaryProps, DevconnectErrorBoundaryState> {
  constructor(props: DevconnectErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): DevconnectErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    const componentName = this.props.componentName || 'Unknown Component'
    console.error(`Error in ${componentName}:`, error)
    console.error('Error Info:', errorInfo)

    // Call the optional error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback UI if provided, otherwise use default
      return (
        this.props.fallback || (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            <div className="text-center p-4">
              <h2 className="text-xl mb-2">Something went wrong</h2>
              <p className="text-sm opacity-70">Please try refreshing the page</p>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default DevconnectErrorBoundary
