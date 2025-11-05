import React, { useMemo } from 'react'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'

const supporters = [
  {
    category: 'defi',
    logo: 'https://0xbow.io/logo.png',
    websiteLink: 'https://0xbow.io/',
  },
  {
    category: 'infrastructure',
    logo: 'https://example.com/chainlink-logo.png',
    websiteLink: 'https://chain.link/',
  },
  {
    category: 'defi',
    logo: 'https://example.com/uniswap-logo.png',
    websiteLink: 'https://uniswap.org/',
  },
  {
    category: 'wallet',
    logo: 'https://example.com/metamask-logo.png',
    websiteLink: 'https://metamask.io/',
  },
  {
    category: 'infrastructure',
    logo: 'https://example.com/alchemy-logo.png',
    websiteLink: 'https://alchemy.com/',
  },
  {
    category: 'layer2',
    logo: 'https://example.com/optimism-logo.png',
    websiteLink: 'https://optimism.io/',
  },
  {
    category: 'nft',
    logo: 'https://example.com/opensea-logo.png',
    websiteLink: 'https://opensea.io/',
  },
  {
    category: 'layer2',
    logo: 'https://example.com/arbitrum-logo.png',
    websiteLink: 'https://arbitrum.io/',
  },
  {
    category: 'defi',
    logo: 'https://example.com/aave-logo.png',
    websiteLink: 'https://aave.com/',
  },
  {
    category: 'wallet',
    logo: 'https://example.com/rainbow-logo.png',
    websiteLink: 'https://rainbow.me/',
  },
  {
    category: 'infrastructure',
    logo: 'https://example.com/infura-logo.png',
    websiteLink: 'https://infura.io/',
  },
  {
    category: 'nft',
    logo: 'https://example.com/zora-logo.png',
    websiteLink: 'https://zora.co/',
  },
  {
    category: 'layer2',
    logo: 'https://example.com/polygon-logo.png',
    websiteLink: 'https://polygon.technology/',
  },
  {
    category: 'defi',
    logo: 'https://example.com/curve-logo.png',
    websiteLink: 'https://curve.fi/',
  },
  {
    category: 'wallet',
    logo: 'https://example.com/coinbase-logo.png',
    websiteLink: 'https://wallet.coinbase.com/',
  },
]

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const SupportersComponent = () => {
  // Randomize order on each load
  const randomizedSupporters = useMemo(() => shuffleArray(supporters), [])

  // Triple the array for infinite scrolling effect
  const infiniteSupporters = useMemo(
    () => [...randomizedSupporters, ...randomizedSupporters, ...randomizedSupporters],
    [randomizedSupporters]
  )

  // Split into 3 rows
  const row1 = infiniteSupporters.filter((_, index) => index % 3 === 0)
  const row2 = infiniteSupporters.filter((_, index) => index % 3 === 1)
  const row3 = infiniteSupporters.filter((_, index) => index % 3 === 2)

  // Calculate speeds based on row length (5 seconds per item for smooth scrolling)
  const speed1 = `${row1.length * 9}s`
  const speed2 = `${row2.length * 10.5}s`
  const speed3 = `${row3.length * 11}s`

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <InfiniteScroll speed={speed1} nDuplications={3}>
        <div style={{ display: 'flex', gap: '20px', padding: '10px 0', paddingRight: '20px' }}>
          {row1.map((supporter, index) => (
            <a
              key={`row1-${index}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '150px',
                height: '80px',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={supporter.logo}
                alt={supporter.category}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </a>
          ))}
        </div>
      </InfiniteScroll>

      <InfiniteScroll speed={speed2} reverse nDuplications={3}>
        <div style={{ display: 'flex', gap: '20px', padding: '10px 0', paddingRight: '20px' }}>
          {row2.map((supporter, index) => (
            <a
              key={`row2-${index}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '150px',
                height: '80px',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={supporter.logo}
                alt={supporter.category}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </a>
          ))}
        </div>
      </InfiniteScroll>

      <InfiniteScroll speed={speed3} nDuplications={3}>
        <div style={{ display: 'flex', gap: '20px', padding: '10px 0', paddingRight: '20px' }}>
          {row3.map((supporter, index) => (
            <a
              key={`row3-${index}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '150px',
                height: '80px',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={supporter.logo}
                alt={supporter.category}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </a>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  )
}

export default SupportersComponent
