'use client'

import React from 'react'
import Image from 'next/image'
import { useAccountContext } from 'context/account-context'
import { useQuery } from '@tanstack/react-query'
import { APP_CONFIG } from 'utils/config'
import { Link } from 'components/common/link'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'

export function Poaps() {
  const { account } = useAccountContext()
  const [openTabs, setOpenTabs] = React.useState<any>({})

  const { data: poaps, isLoading } = useQuery({
    queryKey: ['account', 'poaps', account?.activeAddress || account?.addresses?.[0] || ''],
    queryFn: async () => {
      const address = account?.activeAddress || account?.addresses?.[0] || ''
      if (!address) {
        console.log('No valid address... No poaps')
        return []
      }

      try {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/${address}/poaps`, {
          method: 'GET',
          credentials: 'include',
        })

        const { data } = await response.json()
        return data
      } catch (error) {
        console.error('Error fetching recommended speakers', error)
        return []
      }
    },
  })

  return (
    <CollapsedSection
      className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA] mt-2"
      open={openTabs['poaps']}
      setOpen={() => {
        const isOpen = openTabs['poaps']

        const nextOpenState = {
          ...openTabs,
          ['poaps']: true,
        }

        if (isOpen) {
          delete nextOpenState['poaps']
        }

        setOpenTabs(nextOpenState)
      }}
    >
      <CollapsedSectionHeader title="POAPs" className="py-4 px-4" />
      <CollapsedSectionContent>
        <div className="flex flex-col gap-4 px-4 mt-2 mb-6">
          <div className="font-semibold uppercase text-xs text-[#717784]">Devcon</div>
          <div className="flex flex-wrap gap-8">
            {poaps
              ?.filter((i: any) => i.type === 'devcon')
              .map((poap: any, index: number) => (
                <Link key={poap.tokenId} to={`https://collectors.poap.xyz/token/${poap.tokenId}`} external>
                  <Image
                    className={`rounded-full shrink-0 transform ${
                      index % 2 === 0 ? 'rotate-[12deg]' : 'rotate-[16deg]'
                    }`}
                    src={poap.event?.image_url}
                    alt={poap.event?.name}
                    width={100}
                    height={100}
                  />
                </Link>
              ))}
          </div>
          <div className="font-semibold uppercase text-xs text-[#717784]">Devconnect</div>
          <div className="flex flex-wrap gap-8">
            {poaps
              ?.filter((i: any) => i.type === 'devconnect')
              .map((poap: any, index: number) => (
                <Link key={poap.tokenId} to={`https://collectors.poap.xyz/token/${poap.tokenId}`} external>
                  <Image
                    className={`rounded-full shrink-0 transform ${
                      index % 2 === 0 ? '-rotate-[16deg]' : 'rotate-[12deg]'
                    }`}
                    src={poap.event?.image_url}
                    alt={poap.event?.name}
                    width={100}
                    height={100}
                  />
                </Link>
              ))}
          </div>
        </div>
      </CollapsedSectionContent>
    </CollapsedSection>
  )
}
