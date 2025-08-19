import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  isConnectedAddressOwner, 
  isSafeRegisteredForRecovery, 
  isConnectedToSepolia 
} from '../utils/safeHelpers'
import type { SafeInfo } from './useSafeInfo'

interface UseSafeValidationParams {
  account: any
  safeInfo: SafeInfo | null
  recovererUniqueId: any
  readError: boolean
  readLoading: boolean
}

export function useSafeValidation({ 
  account, 
  safeInfo, 
  recovererUniqueId, 
  readError, 
  readLoading 
}: UseSafeValidationParams) {
  
  // Use TanStack Query to cache validation results
  const { data: validationState } = useQuery({
    queryKey: ['safe-validation', account.address, account.chainId, safeInfo?.address, recovererUniqueId],
    queryFn: () => {
      console.log('🔄 useSafeValidation: Computing validation state for Safe:', safeInfo?.address, 'Chain ID:', account.chainId)
      
      return {
        isOwner: safeInfo ? isConnectedAddressOwner(account, safeInfo) : false,
        isRegisteredForRecovery: isSafeRegisteredForRecovery(recovererUniqueId, readError, readLoading),
        isOnSepolia: isConnectedToSepolia(account),
        timestamp: Date.now()
      }
    },
    enabled: !!account, // Remove the safeInfo requirement so Sepolia check always works
    staleTime: 5000, // Cache for 5 seconds since this is relatively fast to compute
    refetchInterval: 20000, // Automatically refetch every 20 seconds to stay in sync
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not focused
    retry: false // No need to retry pure computations
  })

  // Return memoized functions for backwards compatibility
  const isConnectedAddressOwnerFn = useMemo(() => 
    () => validationState?.isOwner ?? false, 
    [validationState?.isOwner]
  )

  const isSafeRegisteredForRecoveryFn = useMemo(() => 
    () => validationState?.isRegisteredForRecovery ?? false, 
    [validationState?.isRegisteredForRecovery]
  )

  const isConnectedToSepoliaFn = useMemo(() => 
    () => validationState?.isOnSepolia ?? false, 
    [validationState?.isOnSepolia]
  )

  return {
    // Direct values
    isOwner: validationState?.isOwner ?? false,
    isRegisteredForRecovery: validationState?.isRegisteredForRecovery ?? false,
    isOnSepolia: validationState?.isOnSepolia ?? false,
    
    // Function versions for backwards compatibility
    isConnectedAddressOwner: isConnectedAddressOwnerFn,
    isSafeRegisteredForRecovery: isSafeRegisteredForRecoveryFn,
    isConnectedToSepolia: isConnectedToSepoliaFn
  }
}
