import { useQuery } from '@tanstack/react-query'
import { useAccount, useReadContract } from 'wagmi'
import { ZK_MODULE_ABI } from '../utils/constants'

interface UseRecovererInfoParams {
  moduleAddress: string
  safeAddress: string
  enabled?: boolean
}

export const getRecovererInfoQueryKey = (moduleAddress: string, safeAddress: string, accountAddress?: string) => 
  ['recoverer-info', moduleAddress, safeAddress, accountAddress]

export function useRecovererInfo({ moduleAddress, safeAddress, enabled = true }: UseRecovererInfoParams) {
  const account = useAccount()

  const { data: recovererUniqueId, isError: readError, isLoading: readLoading, refetch } = useReadContract({
    address: moduleAddress as `0x${string}`,
    abi: ZK_MODULE_ABI,
    functionName: 'safeToRecoverer',
    args: [safeAddress as `0x${string}`],
    query: {
      enabled: enabled && !!safeAddress && !!moduleAddress,
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchInterval: 20000, // Automatically refetch every 20 seconds
      refetchIntervalInBackground: true, // Continue refreshing even when tab is not focused
      retry: (failureCount, error) => {
        // Don't retry if contract doesn't exist or invalid address
        if (error.message.includes('contract not deployed') || error.message.includes('invalid address')) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  })

  // Log when data changes
  const wrappedRefetch = async () => {
    console.log('🔄 useRecovererInfo: Manual refetch triggered for Safe:', safeAddress)
    return refetch()
  }

  return {
    data: recovererUniqueId,
    isError: readError,
    isLoading: readLoading,
    refetch: wrappedRefetch
  }
}
