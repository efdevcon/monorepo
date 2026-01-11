import makeBlockie from 'ethereum-blockies-base64'
import { useEffect } from 'react'
import { useActiveAddress } from './useActiveAddress'
import { isEmail } from 'utils/validators'
import { useLocalStorage } from './useLocalStorage'
import defaultImage from 'assets/images/account_circle.png'

export const defaultAvatarValue = { connection: '', name: '', url: defaultImage.src, ens: false, status: 'Loading' }
const isBrowser = typeof window !== 'undefined'

export function useAvatar() {
  const activeAddress = useActiveAddress()
  const [avatar, setAvatar] = useLocalStorage(activeAddress, defaultAvatarValue)

  // ENS lookup disabled - wallet functionality temporarily removed
  // Will use blockie avatars instead

  useEffect(() => {
    async function getAvatar() {
      if (!activeAddress) return
      if (activeAddress && isBrowser) {
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

      // Wallet users get blockie avatar (ENS disabled for now)
      setAvatar({
        connection: 'ETHEREUM',
        name: activeAddress,
        url: makeBlockie(activeAddress),
        ens: false,
        status: 'Connected',
      })
    }

    getAvatar()
  }, [activeAddress, setAvatar])

  return avatar
}
