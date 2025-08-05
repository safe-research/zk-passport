import { Chain } from 'viem'
import { sepolia } from 'viem/chains'
import type { UseSwitchChainReturnType } from 'wagmi'

// Types for the helper function parameters
export interface SafeInfo {
  address: string
  owners: string[]
  threshold: number
  isDeployed: boolean
  modules: string[]
}

export interface Account {
  address?: string
  chainId?: number
}

/**
 * Helper function to validate Ethereum address format
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return address.match(/^0x[a-fA-F0-9]{40}$/) !== null
}

/**
 * Helper function to check if connected address is a Safe owner
 */
export const isConnectedAddressOwner = (
  account: Account,
  safeInfo: SafeInfo | null
): boolean => {
  if (!account.address || !safeInfo) return false
  return safeInfo.owners.some(owner => 
    owner.toLowerCase() === account.address!.toLowerCase()
  )
}

/**
 * Helper function to check if Safe is registered for recovery (has a guardian set)
 */
export const isSafeRegisteredForRecovery = (
  recovererUniqueId: any,
  readError: boolean,
  readLoading: boolean
): boolean => {
  // Check if recovererUniqueId exists and is not the zero hash (empty/unset)
  return Boolean(recovererUniqueId && 
                 recovererUniqueId !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
                 recovererUniqueId !== '0x' &&
                 !readError &&
                 !readLoading)
}

/**
 * Helper function to check if connected to Sepolia testnet
 */
export const isConnectedToSepolia = (account: Account): boolean => {
  return account.chainId === sepolia.id
}

/**
 * Helper function to get Sepolia chain from available chains
 */
export const getSepoliaChain = (chains: readonly [Chain, ...Chain[]]): Chain | undefined => {
  return chains.find(chain => chain.id === sepolia.id)
}

/**
 * Helper function to switch to Sepolia network
 */
export const switchToSepolia = (
  chains: readonly [Chain, ...Chain[]],
  switchChain: UseSwitchChainReturnType['switchChain']
): void => {
  const sepoliaChain = getSepoliaChain(chains)
  if (sepoliaChain) {
    switchChain({ chainId: sepoliaChain.id })
  }
}