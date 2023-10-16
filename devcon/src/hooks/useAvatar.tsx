import makeBlockie from "ethereum-blockies-base64"
import { useEffect } from "react"
import { useAccountContext } from "context/account-context"
import { getDefaultProvider } from "utils/web3"
import { useActiveAddress } from "./useActiveAddress"
import defaultImage from 'assets/images/account_circle.png'
import { useSessionStorage } from "./useSessionStorage"
import { isEmail } from "utils/validators"

const defaultValue = { connection: '', name: '', url: defaultImage.src, ens: false, status: 'Loading' }

export function useAvatar() {
    const context = useAccountContext()
    const activeAddress = useActiveAddress()
    const [avatar, setAvatar] = useSessionStorage(activeAddress, defaultValue)

    useEffect(() => {
        async function getAvatar() {
            if (!activeAddress) {
                setAvatar({...defaultValue, status: 'Loading'})
                return
            }
            
            const item = window.sessionStorage.getItem(activeAddress)
            if (item) { 
                const avatar = JSON.parse(item)
                setAvatar(avatar)
                return
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
