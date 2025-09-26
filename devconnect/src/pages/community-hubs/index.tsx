import { useEffect } from 'react'
import { useRouter } from 'next/router'

const CommunityHubsIndex = () => {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the first hub (Account Abstraction Hub) as default
    router.replace('/community-hubs/account-abstraction-hub')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Redirecting to Community Hubs...</div>
    </div>
  )
}

export default CommunityHubsIndex
