'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from 'lib/shadcn/lib/utils'
import { useAccountContext } from 'context/account-context'
import { useQuery } from '@tanstack/react-query'
import { APP_CONFIG } from 'utils/config'
import { Link } from 'components/common/link'

interface Props {
  className?: string
}

export function Poaps(props: Props) {
  const { account } = useAccountContext()
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

  let className = 'flex flex-col gap-4'
  if (props.className) {
    className = cn(props.className)
  }

  return (
    <div className={className}>
      <div className="font-semibold">Devcon</div>
      <div className="flex gap-4">
        {poaps
          ?.filter((i: any) => i.type === 'devcon')
          .map((poap: any) => (
            <Link key={poap.tokenId} to={`https://collectors.poap.xyz/token/${poap.tokenId}`} external>
              <Image
                className="rounded-full"
                src={poap.event?.image_url}
                alt={poap.event?.name}
                width={100}
                height={100}
              />
            </Link>
          ))}
      </div>
      <div className="font-semibold">Devconnect</div>
      <div className="flex gap-4">
        {poaps
          ?.filter((i: any) => i.type === 'devconnect')
          .map((poap: any) => (
            <Link key={poap.tokenId} to={`https://collectors.poap.xyz/token/${poap.tokenId}`} external>
              <Image
                className="rounded-full"
                src={poap.event?.image_url}
                alt={poap.event?.name}
                width={100}
                height={100}
              />
            </Link>
          ))}
      </div>
    </div>
  )
}
