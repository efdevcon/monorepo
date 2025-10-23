import { SEO } from 'common/components/SEO'

const ComingSoonPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <SEO
        title="Community Hubs - Coming Soon | Devconnect"
        description="Community Hubs are coming soon to Devconnect. Stay tuned for exciting updates!"
      />
      
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo/Icon */}
        <div className="m-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Community Hubs
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-600 mb-4">
          Coming Soon...
        </h2>

      </div>
    </div>
  )
}

export default ComingSoonPage
