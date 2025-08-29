'use client'

import { useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { ZKPassport, ProofResult } from "@zkpassport/sdk"
import { encodeAbiParameters } from 'viem'
import { getSafeInfoQueryKey } from './useSafeInfo'
import { ZK_MODULE_ABI, WITNESS_ADDRESS } from '../utils/constants'

interface UseZKPassportFlowProps {
  safeInfo: {
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null
  safeAddress: string
  account: any
  customModuleAddress: string
  handleLoad: () => void
}

export function useZKPassportFlow({ 
  safeInfo, 
  safeAddress, 
  account, 
  customModuleAddress,
  handleLoad 
}: UseZKPassportFlowProps) {
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const queryClient = useQueryClient()
  
  // Track transaction status
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // ZKPassport instance
  const zkPassportRef = useRef<ZKPassport | null>(null)

  // Guardian Registration State
  const [guardianState, setGuardianState] = useState({
    queryUrl: '',
    uniqueIdentifier: '',
    verified: undefined as boolean | undefined,
    inProgress: false
  })

  // Recovery State
  const [recoveryState, setRecoveryState] = useState({
    message: '',
    queryUrl: '',
    uniqueIdentifier: '',
    verified: undefined as boolean | undefined,
    inProgress: false,
    oldOwnerAddress: '',
    newOwnerAddress: ''
  })

  // Initialize ZKPassport
  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport()
    }
  }, [])

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setRecoveryState(prev => ({ ...prev, inProgress: false }))

      // Refresh Safe information after successful transaction
      setTimeout(() => {
        console.log('🔄 Query invalidation: Invalidating Safe info queries after transaction confirmation for Safe:', safeAddress)
        queryClient.invalidateQueries({
          queryKey: getSafeInfoQueryKey(safeAddress, account.address)
        })
        console.log('🔄 Query invalidation: Triggering manual handleLoad after transaction confirmation')
        handleLoad()
      }, 2000)
    }
  }, [isConfirmed, queryClient, safeAddress, account.address, handleLoad])

  const createGuardianRegistration = async () => {
    if (!zkPassportRef.current || !safeInfo) {
      return
    }

    const {
        // The address of the deployed verifier contract
        address,
        // The function name to call on the verifier contract
        functionName,
        // The ABI of the verifier contract
        abi,
      } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

      console.log(address, functionName, abi)
    // Reset state
    setGuardianState({
      queryUrl: '',
      uniqueIdentifier: '',
      verified: undefined,
      inProgress: false
    })

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of humanhood",
      mode: "compressed-evm",
      devMode: false,
    })

    const {
      url,
      onProofGenerated,
      onResult,
      onError,
    } = queryBuilder
      .bind('user_address', safeInfo.address)
      .done()

    setGuardianState(prev => ({ ...prev, queryUrl: url, inProgress: true }))

    let proof: ProofResult | undefined

    onProofGenerated((result: ProofResult) => {
      proof = result
      setGuardianState(prev => ({ ...prev, inProgress: false }))
    })

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      // Get verification parameters
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: proof!,
        devMode: false,
      })

      const wagmiVerifierParams = {
        ...verifierParams,
        vkeyHash: verifierParams.vkeyHash as `0x${string}`,
        proof: verifierParams.proof as `0x${string}`,
        publicInputs: verifierParams.publicInputs as `0x${string}`[],
        committedInputs: verifierParams.committedInputs as `0x${string}`,
        committedInputCounts: verifierParams.committedInputCounts.map((count: number) => BigInt(count)),
        validityPeriodInSeconds: BigInt(verifierParams.validityPeriodInSeconds)
      }

      // Execute registration transaction
      await writeContract({
        address: customModuleAddress as `0x${string}`,
        abi: ZK_MODULE_ABI,
        functionName: 'register',
        args: [wagmiVerifierParams],
        gas: 1000000n,
      })

      setGuardianState(prev => ({
        ...prev,
        uniqueIdentifier: uniqueIdentifier || '',
        verified,
        inProgress: false
      }))
    })

    onError((error: unknown) => {
      setGuardianState(prev => ({ ...prev, inProgress: false }))
    })
  }

  const createRecoveryRequest = async () => {
    if (!zkPassportRef.current || !safeInfo || !recoveryState.oldOwnerAddress || !recoveryState.newOwnerAddress) {
      return
    }

    // Reset recovery state except addresses
    setRecoveryState(prev => ({
      ...prev,
      message: '',
      queryUrl: '',
      uniqueIdentifier: '',
      verified: undefined
    }))

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Safe Recovery - Verify your identity to recover access",
      mode: "compressed-evm",
      devMode: false,
    })

    const ownerIndex = safeInfo.owners.indexOf(recoveryState.oldOwnerAddress)
    const previousOwner = ownerIndex === 0 ? WITNESS_ADDRESS : safeInfo.owners[ownerIndex - 1]

    const {
      url,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onError,
    } = queryBuilder
      .bind('user_address', recoveryState.newOwnerAddress)
      .bind('custom_data', encodeAbiParameters(
        [
          { name: 'previousOwner', type: 'address' }, 
          { name: 'oldOwner', type: 'address' }, 
          { name: 'newOwner', type: 'address' }, 
          { name: 'safeAddress', type: 'address' }
        ],
        [previousOwner, recoveryState.oldOwnerAddress, recoveryState.newOwnerAddress, safeAddress]
      ))
      .done()

    setRecoveryState(prev => ({ 
      ...prev, 
      queryUrl: url, 
      inProgress: true 
    }))

    onGeneratingProof(() => {
      setRecoveryState(prev => ({ ...prev, message: "Generating recovery proof..." }))
    })

    let recoveryProof: ProofResult | undefined

    onProofGenerated((result: ProofResult) => {
      recoveryProof = result
      setRecoveryState(prev => ({ 
        ...prev, 
        message: "Recovery proof received", 
        inProgress: false 
      }))
    })

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      // Get verification parameters for the recovery transaction
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: recoveryProof!,
        devMode: false,
      })

      // Convert parameters for wagmi compatibility
      const wagmiVerifierParams = {
        ...verifierParams,
        vkeyHash: verifierParams.vkeyHash as `0x${string}`,
        proof: verifierParams.proof as `0x${string}`,
        publicInputs: verifierParams.publicInputs as `0x${string}`[],
        committedInputs: verifierParams.committedInputs as `0x${string}`,
        committedInputCounts: verifierParams.committedInputCounts.map((count: number) => BigInt(count)),
        validityPeriodInSeconds: BigInt(verifierParams.validityPeriodInSeconds)
      }

      try {
        // Execute recovery transaction
        await writeContract({
          address: customModuleAddress as `0x${string}`,
          abi: ZK_MODULE_ABI,
          functionName: 'recover',
          args: [wagmiVerifierParams],
          gas: 1000000n,
        })

        setRecoveryState(prev => ({ 
          ...prev, 
          message: "Recovery transaction submitted - waiting for confirmation" 
        }))

      } catch (err) {
        setRecoveryState(prev => ({ 
          ...prev, 
          message: "Recovery transaction failed: " + (err instanceof Error ? err.message : 'Unknown error'),
          inProgress: false
        }))
        return
      }

      setRecoveryState(prev => ({
        ...prev,
        uniqueIdentifier: uniqueIdentifier || '',
        verified,
        inProgress: false
      }))
    })

    onError((error: unknown) => {
      setRecoveryState(prev => ({ 
        ...prev, 
        message: "An error occurred during recovery", 
        inProgress: false 
      }))
    })
  }

  const updateRecoveryAddresses = (oldOwner: string, newOwner: string) => {
    setRecoveryState(prev => ({
      ...prev,
      oldOwnerAddress: oldOwner,
      newOwnerAddress: newOwner
    }))
  }

  return {
    // Guardian Registration
    guardianState,
    createGuardianRegistration,
    
    // Recovery
    recoveryState,
    createRecoveryRequest,
    updateRecoveryAddresses,
    
    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    writeError
  }
}
