import WalletConnectProvider from '@walletconnect/web3-provider'
import { ethers } from 'ethers'
import { VerificationToken } from 'types/VerificationToken'
import Web3Modal from 'web3modal'
import { APP_CONFIG } from './config'
const sigUtil = require('eth-sig-util')

declare var window: any
const isBrowser = typeof window !== 'undefined'

export function getWeb3ProviderOptions() {
  return {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: APP_CONFIG.INFURA_APIKEY,
      },
    },
  }
}

export function getWeb3Modal(): Web3Modal | undefined {
  const providerOptions = getWeb3ProviderOptions()

  if (isBrowser) {
    return new Web3Modal({
      network: 'mainnet',
      cacheProvider: false,
      providerOptions,
    })
  }
}

export function getDefaultProvider(): ethers.providers.BaseProvider {
  return ethers.getDefaultProvider(undefined, {
    etherscan: APP_CONFIG.ETHERSCAN_APIKEY,
    infura: APP_CONFIG.INFURA_APIKEY,
    alchemy: APP_CONFIG.ALCHEMY_APIKEY,
    // pocket: YOUR_POCKET_APPLICATION_KEY
  })
}

export function getSiweMessage(address: string, token: VerificationToken): string {
  return `devcon.org wants you to sign in with your Ethereum account:
${address}

Sign this message to prove you have access to this wallet. This won't cost you anything.

URI: https://devcon.org/
Version: 1
Nonce: ${token.nonce}
Issued At: ${token.issued}
Expiration Time: ${token.expires}
Chain ID: 1`
}

export const isValidSignature = (address: string, message: string, signature: string): boolean => {
  const params = {
    data: message,
    sig: signature
  }
  
  try {
    const recovered = sigUtil.recoverPersonalSignature(params)
    if (!recovered || recovered !== address) {
      return false
    }

    return true
  }
  catch (e) {
    return false
  }
}
