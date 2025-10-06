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
