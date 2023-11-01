import makeBlockie from "ethereum-blockies-base64"
import { useEffect } from "react"
import { useAccountContext } from "context/account-context"
import { getDefaultProvider } from "utils/web3"
import { useActiveAddress } from "./useActiveAddress"
import defaultImage from 'assets/images/account_circle.png'
import { isEmail } from "utils/validators"
import { useLocalStorage } from "./useLocalStorage"

export const defaultAvatarValue = { connection: '', name: '', url: defaultImage.src, ens: false, status: 'Loading' }
const isBrowser = typeof window !== 'undefined'

export function useAvatar() {
    const context = useAccountContext()
    const activeAddress = useActiveAddress()
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
                    status: 'Connected'
                })
                return
            }

            const provider = context.provider ?? getDefaultProvider()
            const name = await provider.lookupAddress(activeAddress)
            if (!name) {
                setAvatar({
                    connection: 'ETHEREUM',
                    name: activeAddress,
                    url: makeBlockie(activeAddress),
                    ens: false,
                    status: 'Connected'
                })
                return
            }

            const resolver = await provider.getResolver(name)
            const ensAvatar = await resolver?.getAvatar()
            setAvatar({
                connection: 'ETHEREUM',
                name: name,
                url: ensAvatar?.url ?? makeBlockie(activeAddress),
                ens: true,
                status: 'Connected'
            })
        }

        getAvatar()
    }, [activeAddress])

    return avatar
}
