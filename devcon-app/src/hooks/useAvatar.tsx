import makeBlockie from 'ethereum-blockies-base64'
import { useEffect, useState } from 'react'
import { useActiveAddress } from './useActiveAddress'
import { isEmail } from 'utils/validators'
import { useLocalStorage } from './useLocalStorage'
import defaultImage from 'assets/images/account_circle.png'

export const defaultAvatarValue = { connection: '', name: '', url: defaultImage.src, ens: false, status: 'Loading' }
const isBrowser = typeof window !== 'undefined'

export function useAvatar() {
  const activeAddress = useActiveAddress()
  const [avatar, setAvatar] = useLocalStorage(activeAddress, defaultAvatarValue)
  const [ensData, setEnsData] = useState<{ name: string | null; avatar: string | null }>({ name: null, avatar: null })

  // Fetch ENS data dynamically to avoid wagmi imports at build time
  useEffect(() => {
    if (!activeAddress || isEmail(activeAddress)) return

    const fetchEnsData = async () => {
      try {
        // Dynamic imports to avoid server-side bundling
        const [wagmiActions, viemModule, walletModule] = await Promise.all([
          import('wagmi/actions'),
          import('viem/ens'),
          import('utils/wallet'),
        ])

        const config = walletModule.wagmiAdapter.wagmiConfig

        const name = await wagmiActions.getEnsName(config, {
          address: activeAddress as `0x${string}`,
          chainId: 1,
        })

        let avatar = null
        if (name) {
          avatar = await wagmiActions.getEnsAvatar(config, {
            name: viemModule.normalize(name),
            chainId: 1,
          })
        }

        setEnsData({ name, avatar })
      } catch (error) {
        // ENS lookup failed, will use default avatar
        setEnsData({ name: null, avatar: null })
      }
    }

    fetchEnsData()
  }, [activeAddress])

  useEffect(() => {
    async function getAvatar() {
      if (!activeAddress) return
      if (activeAddress && isBrowser) {
        // TODO: unable to return from useLocalStorage?
        const item = window.localStorage.getItem(activeAddress)
        if (item) return setAvatar(JSON.parse(item))
      }

      if (isEmail(activeAddress)) {
        setAvatar({
          connection: 'EMAIL',
          name: activeAddress,
          url: makeBlockie(activeAddress),
          ens: false,
          status: 'Connected',
        })
        return
      }

      if (!ensData.name) {
        setAvatar({
          connection: 'ETHEREUM',
          name: activeAddress,
          url: makeBlockie(activeAddress),
          ens: false,
          status: 'Connected',
        })
        return
      }

      setAvatar({
        connection: 'ETHEREUM',
        name: ensData.name,
        url: ensData.avatar ?? makeBlockie(activeAddress ?? ''),
        ens: true,
        status: 'Connected',
      })
    }

    getAvatar()
  }, [activeAddress, ensData.name, ensData.avatar, setAvatar])

  return avatar
}
