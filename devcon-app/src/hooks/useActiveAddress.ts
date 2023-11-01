import { useAccountContext } from 'context/account-context'
import { getUsername } from 'utils/account'

export const useActiveAddress = (): string => {
  const context = useAccountContext()

  if (!context.account) {
    return ''
  }
  
  return getUsername(context.account)
}
