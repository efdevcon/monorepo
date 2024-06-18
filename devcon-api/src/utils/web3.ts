import { ethers, verifyMessage } from "ethers"

export const isValidSignature = (address: string, message: string, signature: string): boolean => {
    try {
      const recovered = verifyMessage(message, signature)      
      if (!recovered || ethers.getAddress(recovered) !== ethers.getAddress(address)) {
        return false
      }
  
      return true
    }
    catch (e) {
      return false
    }
  }
  