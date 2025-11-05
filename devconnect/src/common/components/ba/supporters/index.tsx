import React, { useMemo } from 'react'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import Image from 'next/image'
import { supportersData } from 'data/supporters'

// const supporters = [
//   {
//     category: 'defi',
//     logo: 'https://picsum.photos/seed/defi1/200/100',
//     websiteLink: 'https://0xbow.io/',
//   },
//   {
//     category: 'infrastructure',
//     logo: 'https://picsum.photos/seed/infra1/200/100',
//     websiteLink: 'https://chain.link/',
//   },
//   {
//     category: 'defi',
//     logo: 'https://picsum.photos/seed/defi2/200/100',
//     websiteLink: 'https://uniswap.org/',
//   },
//   {
//     category: 'wallet',
//     logo: 'https://picsum.photos/seed/wallet1/200/100',
//     websiteLink: 'https://metamask.io/',
//   },
//   {
//     category: 'infrastructure',
//     logo: 'https://picsum.photos/seed/infra2/200/100',
//     websiteLink: 'https://alchemy.com/',
//   },
//   {
//     category: 'layer2',
//     logo: 'https://picsum.photos/seed/layer2-1/200/100',
//     websiteLink: 'https://optimism.io/',
//   },
//   {
//     category: 'nft',
//     logo: 'https://picsum.photos/seed/nft1/200/100',
//     websiteLink: 'https://opensea.io/',
//   },
//   {
//     category: 'layer2',
//     logo: 'https://picsum.photos/seed/layer2-2/200/100',
//     websiteLink: 'https://arbitrum.io/',
//   },
//   {
//     category: 'defi',
//     logo: 'https://picsum.photos/seed/defi3/200/100',
//     websiteLink: 'https://aave.com/',
//   },
//   {
//     category: 'wallet',
//     logo: 'https://picsum.photos/seed/wallet2/200/100',
//     websiteLink: 'https://rainbow.me/',
//   },
//   {
//     category: 'infrastructure',
//     logo: 'https://picsum.photos/seed/infra3/200/100',
//     websiteLink: 'https://infura.io/',
//   },
//   {
//     category: 'nft',
//     logo: 'https://picsum.photos/seed/nft2/200/100',
//     websiteLink: 'https://zora.co/',
//   },
//   {
//     category: 'layer2',
//     logo: 'https://picsum.photos/seed/layer2-3/200/100',
//     websiteLink: 'https://polygon.technology/',
//   },
//   {
//     category: 'defi',
//     logo: 'https://picsum.photos/seed/defi4/200/100',
//     websiteLink: 'https://curve.fi/',
//   },
//   {
//     category: 'wallet',
//     logo: 'https://picsum.photos/seed/wallet3/200/100',
//     websiteLink: 'https://wallet.coinbase.com/',
//   },
// ]

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
  // Convert supportersData object to array and use largeLogo
  const supporters = useMemo(() => {
    return Object.entries(supportersData)
      .filter(([_, s]) => s.largeLogo) // Only include supporters with largeLogo
      .map(([id, s]) => ({
        id,
        logo: s.largeLogo!,
        websiteLink: s.websiteLink || '',
        category: s.name,
      }))
  }, [])

  // Randomize order on each load
  const randomizedSupporters = useMemo(() => shuffleArray(supporters), [supporters])

  // console.log(supporters, 'hello')

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
          {row1.map(supporter => (
            <a
              key={`row1-${supporter.id}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minWidth: '150px',
                height: '80px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '18px',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={supporter.logo} alt={supporter.category} fill style={{ objectFit: 'contain' }} />
              </div>
            </a>
          ))}
        </div>
      </InfiniteScroll>

      <InfiniteScroll speed={speed2} reverse nDuplications={3}>
        <div style={{ display: 'flex', gap: '20px', padding: '10px 0', paddingRight: '20px' }}>
          {row2.map(supporter => (
            <a
              key={`row2-${supporter.id}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minWidth: '150px',
                height: '80px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '18px',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={supporter.logo} alt={supporter.category} fill style={{ objectFit: 'contain' }} />
              </div>
            </a>
          ))}
        </div>
      </InfiniteScroll>

      <InfiniteScroll speed={speed3} nDuplications={3}>
        <div style={{ display: 'flex', gap: '20px', padding: '10px 0', paddingRight: '20px' }}>
          {row3.map(supporter => (
            <a
              key={`row3-${supporter.id}`}
              href={supporter.websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minWidth: '150px',
                height: '80px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '18px',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={supporter.logo} alt={supporter.category} fill style={{ objectFit: 'contain' }} />
              </div>
            </a>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  )
}

export default SupportersComponent
