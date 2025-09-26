import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { SEO } from 'common/components/SEO'
import cn from 'classnames'

// Hub data with slugs and iframe URLs (ordered alphabetically)
const hubData = [
  {
    name: 'Account Abstraction Hub',
    slug: 'account-abstraction-hub',
    iframeUrl: 'https://sheets.fileverse.io/0x98DbBf35363bC25916102378985bB5cae100980D/2#key=qfv1YxPyQp_BFC4z6b5FAAE3vftuWRxpHI9I99NYE7d-4QFNs2Myn7omHmNUyS-3'
  },
  {
    name: 'Enterprise Hub',
    slug: 'enterprise-hub',
    iframeUrl: 'https://sheets.fileverse.io/0x98DbBf35363bC25916102378985bB5cae100980D/3#key=QAuUh_Kyzcdvj8KWTF25VitnbHNXbje_BPajt2cl27x0qSRXq4v_WZ7dCnGyx7I0'
  },
  {
    name: 'Fintech & Onchain Banking',
    slug: 'fintech-onchain-banking',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Governance Geeks Hub',
    slug: 'governance-geeks-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'LATAM Hub',
    slug: 'latam-hub',
    iframeUrl: 'https://docs.fileverse.io/0xD5163Be90431A96Ad4dcD585de1c6744B64cc653/1#key=m3i4dVPL7bXag53tKzzR0L7_WrsHn9-CLCKVzJxiMNdKCE3lio9uf16fTogWD2oP'
  },
  {
    name: 'Node Operators Hub',
    slug: 'node-operators-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Onchain Art Hub',
    slug: 'onchain-art-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Open Source Community Hub',
    slug: 'open-source-community-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Pop-Up Cities',
    slug: 'pop-up-cities',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Privacy Hub',
    slug: 'privacy-hub',
    iframeUrl: 'https://docs.fileverse.io/0xD5163Be90431A96Ad4dcD585de1c6744B64cc653/0#key=v0ddsTX0pWD2D7R_ZknUFf36Dz7iiIuiZpg7YR2vG1GKKkN649h7ORmkl7ypZj5X'
  },
  {
    name: 'Regen Hub',
    slug: 'regen-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'RWA Hub',
    slug: 'rwa-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'Women in Web3 Hub',
    slug: 'women-in-web3-hub',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  },
  {
    name: 'World of DeSci',
    slug: 'world-of-desci',
    iframeUrl: 'https://docs.fileverse.io/0xa71a99940Bd85C173397c8aE3986960785c762B6/2#key=W0074ipXQf-mB7755hgizLDiXO3i8WGocceiwvjlQ6VmkxVs98G7xI-sBbrPbkAx'
  }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title="Community Hubs - Devconnect"
        description="Explore various community hubs and specialized groups within the Devconnect ecosystem"
      />
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1">
        {/* Hub List - Left Sidebar */}
        <div className="w-80 bg-white shadow-sm border-r flex-shrink-0">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">All Hubs</h2>
            <p className="text-sm text-gray-600">Click to switch</p>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-[calc(100vh-120px)] overflow-y-auto">
            {hubData.map((hub, index) => (
              <button
                key={hub.slug}
                onClick={() => handleHubClick(hub)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                  'flex items-center justify-between',
                  selectedHub?.slug === hub.slug
                    ? 'bg-blue-50 border-r-4 border-blue-500'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {hub.name}
                  </div>
                </div>
                {selectedHub?.slug === hub.slug && (
                  <div className="ml-2">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
            <iframe
              src={selectedHub.iframeUrl}
              className="w-full h-full"
              title={selectedHub.name}
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Main Content - Iframe */}
        <div className="flex-1 bg-white" style={{ height: 'calc(100vh - 80px)' }}>
          {selectedHub && (
            <iframe
              src={selectedHub.iframeUrl}
              className="w-full h-full"
              title={selectedHub.name}
              loading="lazy"
            />
          )}
        </div>

        {/* Hub List - Bottom Horizontal Scroll */}
        <div className="bg-white border-t shadow-sm">
          <div className="flex overflow-x-auto pb-4 px-4 space-x-2 pt-4">
            {hubData.map((hub, index) => (
              <button
                key={hub.slug}
                onClick={() => handleHubClick(hub)}
                className={cn(
                  'flex-shrink-0 px-4 py-3 rounded-lg text-left transition-colors',
                  'min-w-[200px] max-w-[250px]',
                  selectedHub?.slug === hub.slug
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                )}
              >
                <div className="font-medium text-sm text-gray-900">
                  {hub.name}
                </div>
              </button>
            ))}
          </div>
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
