import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { SEO } from 'common/components/SEO'
import cn from 'classnames'

// Hub data with slugs and iframe URLs (ordered alphabetically)
const hubData = [
  {
    name: 'Account Abstraction Hub',
    slug: 'account-abstraction-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x6a38400092405042218429eC8CCC356AE6281159/0#key=aDDz3aWDUHXBZEbtzh8K23cy_3Y7dIH_fM8UaI2AJZ2eEw77nViozkLNSH2YHzPT',
  },
  {
    name: 'DeSci Hub',
    slug: 'desci-hub',
    iframeUrl:
      'https://docs.fileverse.io/0xcfE93795a36912643355Cc1Be236ca8b7C62d57f/2#key=HPDG4NKjNpX1z-brUZgytf580tWoYX8jbRPkT_zKawGkmCiiYcoqrqeWfWUGHQF2',
  },
  {
    name: 'Enterprise Hub',
    slug: 'enterprise-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x3fc1296afb147C0d7C45b091b0b30bddDafa1bA2/0#key=jMZyROt2cuPoDvEJNLIk91Q6LjnCYLQuLPIBjUS3DyAehPUctjtqJa6WlZjILhHh',
  },
  {
    name: 'Future Cities & Hubs',
    slug: 'future-cities-hubs',
    iframeUrl:
      'https://sheets.fileverse.io/0x18ebF62443415a370944b95623E3Df2dB972A51d/1#key=NUQMtJPkl3MsGv4na8Q_Bcs_v3ufFVeN0Vv0vNhqRH3-uCYPqSmh0_8EL5xANMwQ',
  },
  {
    name: 'Governance Geeks Hub',
    slug: 'governance-geeks-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x6077c53D8aCc8516182A8C027513E09d526e946f/0#key=Wb-JHetK4P97uaGFwk0INhtspmQx0JGqi2Wsf8CDDS6kSjZEJUxidbp8LSdjw6Vs',
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
    iframeUrl:
      'https://sheets.fileverse.io/0xb2648b31cB0E32f9a2499AC1d2eb76527cB28E04/5#key=OuJktJlaUsuEcJ-u5K3imFc5_71zh0_XISZEtefwWWuEcqg3oZIxN9qmvQC-CBEM',
  },
  {
    name: 'Onchain Fintech Hub',
    slug: 'onchain-fintech-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xEf5CF44678A758bd4169effEdD587E9B1B782595/0#key=BjYlUfeiUwGF5ZwuBsuJ4S5TFhmhVR9MWZnYvy98Z8DcysXkoyAfja-OEALSrVIu',
  },
  {
    name: 'Open Source Hub',
    slug: 'open-source-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x06Cc230df1c166Da28892B7d92D01773d1b6B63f/3#key=NEaP5yPHPWLf1yvPxB06LoSkVT_ZaMNL23pH1hw3WQILZ1mJZjDgAyc-imfNADQP',
  },
  {
    name: 'Privacy Hub',
    slug: 'privacy-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x76c97623ecB250Cda54b431a63c1523a5B50003c/0#key=1g_H3jaYmAs_Hm-tjJOLv3Gh9eTY1BKUo9XT8ze7qaqLBdW-Kir2Joj3df1aczyK',
  },
  {
    name: 'Real World Assets Hub',
    slug: 'real-world-assets-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xf67a5a6B6cF7Df1699Fd86F264d99D4ED2088239/0#key=n8vAQv0ih06phF4E5b6x2vsfHutRk4rrHeDrGaO7N1acLCnvQTjqjTJNW81bU7dy',
  },
  {
    name: 'Regen Hub',
    slug: 'regen-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0x170991B85cc8020b7c45CD43d331cF774E437447/1#key=Q8iSQJ9nVeeMYCeMsUoxGH-Gt2j467PXS-7_4-NeEyGVGxy5a9zyeCy99U7s-HcP',
  },
  {
    name: 'Women in Web3 Hub',
    slug: 'women-in-web3-hub',
    iframeUrl:
      'https://sheets.fileverse.io/0xf8Bf774665BF3A048961B42d3817537245765db9/1#key=xqD5J3X2kp-WoKtsIjA_KUpGDY_qYyta0SjrGct_91Ws3DYXNPXOiDE6mx7DZlog',
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
