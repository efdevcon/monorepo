import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { SEO } from 'common/components/SEO'
import cn from 'classnames'

// Hub data with slugs and iframe URLs (ordered alphabetically)
const hubData = [
  {
    name: 'Account Abstraction Hub',
    slug: 'account-abstraction-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Enterprise Hub',
    slug: 'enterprise-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x3fc1296afb147C0d7C45b091b0b30bddDafa1bA2/0#key=jMZyROt2cuPoDvEJNLIk91Q6LjnCYLQuLPIBjUS3DyAehPUctjtqJa6WlZjILhHh',
  },
  {
    name: 'Fintech & Onchain Banking',
    slug: 'fintech-onchain-banking',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Governance Geeks Hub',
    slug: 'governance-geeks-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'LATAM Hub',
    slug: 'latam-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x70f8c0B16Bd3F0806df9FA2Feb224ff8feA8d5EA/0#key=ia8zHKbr-Au-HUpiP-svhx7AHWw9C14oZ5skscMqifL31RXz5y9t1ABkXGdb5UiX',
  },
  {
    name: 'Legal Tech Hub',
    slug: 'legal-tech-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xf8Bf774665BF3A048961B42d3817537245765db9/0#key=K0zVPDpXwd2nMfsXCIViTDrYBbM3DT38E4hsz_blD8MTyLy4sEqey8dxBtDIpmJ2',
  },
  {
    name: 'Node Operators Hub',
    slug: 'node-operators-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xdeBC4b48512d9DBC0E85160C5554F6562A72A3AF/0#key=RFUd7u9ZMQhnzwECgdz2r3t5Yh__tWvRfpQgNFbYKjh-454emesTsKjnFM-Ju4tN',
  },
  {
    name: 'Onchain Art Hub',
    slug: 'onchain-art-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Open Source Community Hub',
    slug: 'open-source-community-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Pop-Up Cities',
    slug: 'pop-up-cities',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Privacy Hub',
    slug: 'privacy-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Regen Hub',
    slug: 'regen-hub',
    iframeUrl:
      'https://regensunite.notion.site/ebd/27a859725d2980909ba6ee9aab4029e2?v=27a859725d298011bd65000c9b79dd0a',
  },
  {
    name: 'RWA Hub',
    slug: 'rwa-hub',
    iframeUrl: '/community-hubs/coming-soon',
  },
  {
    name: 'Women in Web3 Hub',
    slug: 'women-in-web3-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xf8Bf774665BF3A048961B42d3817537245765db9/1#key=xqD5J3X2kp-WoKtsIjA_KUpGDY_qYyta0SjrGct_91Ws3DYXNPXOiDE6mx7DZlog',
  },
  {
    name: 'World of DeSci',
    slug: 'world-of-desci',
    iframeUrl: '/community-hubs/coming-soon',
  },
]

const CommunityHubsPage = () => {
  const router = useRouter()
  const [selectedHub, setSelectedHub] = useState<typeof hubData[0] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get current hub from URL
  useEffect(() => {
    if (router.isReady && router.query.hub) {
      const hubSlug = Array.isArray(router.query.hub) ? router.query.hub[0] : router.query.hub
      const hub = hubData.find(h => h.slug === hubSlug)
      if (hub) {
        setSelectedHub(hub)
      } else {
        // Default to first hub if not found
        setSelectedHub(hubData[0])
        router.replace('/community-hubs/privacy-hub', undefined, { shallow: true })
      }
      setIsLoading(false)
    }
  }, [router.isReady, router.query.hub])

  const handleHubClick = (hub: typeof hubData[0]) => {
    setSelectedHub(hub)
    router.push(`/community-hubs/${hub.slug}`, undefined, { shallow: true })
  }

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const hub = hubData.find(h => h.slug === event.target.value)
    if (hub) {
      handleHubClick(hub)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <SEO
        title="Community Hubs - Devconnect"
        description="Explore various community hubs and specialized groups within the Devconnect ecosystem"
      />

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1">
        {/* Hub List - Left Sidebar */}
        <div className="bg-slate-200 shadow-sm border-r flex-shrink-0" style={{ width: '250px' }}>
          <div className="p-4 border-b bg-slate-300">
            <h2 className="text-lg font-semibold text-slate-800">All Community Hubs</h2>
            <p className="text-sm text-slate-600">Click to switch</p>
          </div>

          <div className="divide-y divide-gray-200 max-h-[calc(100vh-120px)] overflow-y-auto">
            {hubData.map((hub, index) => (
              <button
                key={hub.slug}
                onClick={() => handleHubClick(hub)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  'flex items-center justify-between',
                  selectedHub?.slug === hub.slug
                    ? 'bg-blue-200 border-r-4 border-blue-600 text-blue-900'
                    : 'hover:bg-slate-300 text-slate-700 hover:text-slate-900'
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{hub.name}</div>
                </div>
                {selectedHub?.slug === hub.slug && (
                  <div className="ml-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Iframe */}
        <div className="flex-1 bg-white">
          {selectedHub && (
            <iframe src={selectedHub.iframeUrl} className="w-full h-full" title={selectedHub.name} loading="lazy" />
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Main Content - Iframe */}
        <div className="flex-1 bg-white overflow-hidden">
          {selectedHub && (
            <iframe src={selectedHub.iframeUrl} className="w-full h-full" title={selectedHub.name} loading="lazy" />
          )}
        </div>

        {/* Hub Selector - Bottom */}
        <div className="bg-slate-200 border-t shadow-sm p-4 flex-shrink-0 safe-bottom">
          <select
            id="hub-select"
            value={selectedHub?.slug || ''}
            onChange={handleSelectChange}
            className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            {hubData.map(hub => (
              <option key={hub.slug} value={hub.slug}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export async function getStaticPaths() {
  const paths = hubData.map((hub) => ({
    params: { hub: [hub.slug] }
  }))

  return {
    paths,
    fallback: false
  }
}

export async function getStaticProps() {
  return {
    props: {}
  }
}

export default CommunityHubsPage
