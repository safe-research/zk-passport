import { useQuery } from '@tanstack/react-query'
import Safe, { Eip1193Provider } from '@safe-global/protocol-kit'
import { useAccount } from 'wagmi'

export interface SafeInfo {
  address: string
  owners: string[]
  threshold: number
  isDeployed: boolean
  modules: string[]
}

interface UseSafeInfoParams {
  safeAddress: string
  enabled?: boolean
}

async function fetchSafeInfo(
  safeAddress: string, 
  provider: Eip1193Provider, 
  signerAddress: string
): Promise<SafeInfo> {
  if (!safeAddress || !provider || !signerAddress) {
    throw new Error('Missing required parameters')
  }

  // Initialize the Protocol Kit with the existing Safe address
  const protocolKit = await Safe.init({
    provider: provider,
    signer: signerAddress,
    safeAddress: safeAddress.trim()
  })

  // Check if the Safe is deployed
  const isDeployed = await protocolKit.isSafeDeployed()

  if (!isDeployed) {
    throw new Error('Safe not found at this address or not deployed')
  }

  // Get Safe information
  const address = await protocolKit.getAddress()
  const owners = await protocolKit.getOwners()
  const threshold = await protocolKit.getThreshold()
  const modules = await protocolKit.getModules()

  return {
    address,
    owners,
    threshold,
    isDeployed,
    modules
  }
}

export const getSafeInfoQueryKey = (safeAddress: string, accountAddress?: string) => 
  ['safe-info', safeAddress, accountAddress]

export function useSafeInfo({ safeAddress, enabled = true }: UseSafeInfoParams) {
  const account = useAccount()

  return useQuery({
    queryKey: getSafeInfoQueryKey(safeAddress, account.address),
    queryFn: async () => {
      console.log('🔄 useSafeInfo: Refreshing Safe data for address:', safeAddress)
      
      if (!account.address || !account.connector) {
        throw new Error('Wallet not connected')
      }

      const provider = await account.connector.getProvider()
      if (!provider) {
        throw new Error('Provider not available')
      }

      const result = await fetchSafeInfo(safeAddress, provider as Eip1193Provider, account.address)
      console.log('✅ useSafeInfo: Safe data refreshed successfully:', result)
      return result
    },
    enabled: enabled && !!safeAddress && !!account.address && !!account.connector,
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: (failureCount, error) => {
      // Don't retry if Safe is not deployed or invalid address
      if (error.message.includes('Safe not found') || error.message.includes('not deployed')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}
