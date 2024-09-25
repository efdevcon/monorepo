import makeBlockie from 'ethereum-blockies-base64'
import { useEffect } from 'react'
import { useActiveAddress } from './useActiveAddress'
import { isEmail } from 'utils/validators'
import { useLocalStorage } from './useLocalStorage'
import { useEnsAvatar, useEnsName } from 'wagmi'
import { normalize } from 'viem/ens'
import defaultImage from 'assets/images/account_circle.png'

export const defaultAvatarValue = { connection: '', name: '', url: defaultImage.src, ens: false, status: 'Loading' }
const isBrowser = typeof window !== 'undefined'

export function useAvatar() {
  const activeAddress = useActiveAddress()
  const { data: ensName } = useEnsName({
    address: activeAddress as `0x${string}`,
    chainId: 1,
  })
  const { data: ensAvatar } = useEnsAvatar({ name: normalize(ensName as string), chainId: 1 })
  const [avatar, setAvatar] = useLocalStorage(activeAddress, defaultAvatarValue)

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

      if (!ensName) {
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
        name: ensName,
        url: ensAvatar ?? makeBlockie(activeAddress ?? ''),
        ens: true,
        status: 'Connected',
      })
    }

    getAvatar()
  }, [activeAddress, ensName, ensAvatar])

  return avatar
}
