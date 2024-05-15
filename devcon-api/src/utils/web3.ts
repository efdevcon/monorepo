import { verifyMessage } from "ethers"

export const isValidSignature = (address: string, message: string, signature: string): boolean => {
    try {
      const recovered = verifyMessage(message, signature)
      if (!recovered || recovered !== address) {
        return false
      }
  
      return true
    }
    catch (e) {
      return false
    }
  }
  