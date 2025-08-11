'use client'

import { useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ZKPassport, ProofResult } from "@zkpassport/sdk"
import Safe, { Eip1193Provider } from '@safe-global/protocol-kit'
import QRCode from "react-qr-code"
import { MetaTransactionData, OperationType } from '@safe-global/types-kit'
import { encodeFunctionData } from 'viem'
import { isValidEthereumAddress } from '../utils/safeHelpers'
import styles from './ZKPassportSection.module.css'
import { ZK_MODULE_ADDRESS, WITNESS_ADDRESS, ZK_MODULE_ABI } from '../utils/constants'



interface ZKPassportSectionProps {
  account: any
  safeInfo: {
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null
  ethereumAddress: string
  recovererUniqueId: any
  readError: boolean
  readLoading: boolean
  isConnectedAddressOwner: () => boolean
  isSafeRegisteredForRecovery: () => boolean
  isConnectedToSepolia: () => boolean
  handleLoad: () => void
}

function ZKPassportSection({
  account,
  safeInfo,
  ethereumAddress,
  recovererUniqueId,
  readError,
  readLoading,
  isConnectedAddressOwner,
  isSafeRegisteredForRecovery,
  isConnectedToSepolia,
  handleLoad
}: ZKPassportSectionProps) {
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  
  // Track transaction status and refresh Safe info when confirmed
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })
  
  const [message, setMessage] = useState("")
  const [queryUrl, setQueryUrl] = useState("")
  const [uniqueIdentifier, setUniqueIdentifier] = useState("")
  const [verified, setVerified] = useState<boolean | undefined>(undefined)
  const [requestInProgress, setRequestInProgress] = useState(false)
  
  // Recovery-specific state variables
  const [recoveryMessage, setRecoveryMessage] = useState("")
  const [recoveryQueryUrl, setRecoveryQueryUrl] = useState("")
  const [recoveryUniqueIdentifier, setRecoveryUniqueIdentifier] = useState("")
  const [recoveryVerified, setRecoveryVerified] = useState<boolean | undefined>(undefined)
  const [recoveryInProgress, setRecoveryInProgress] = useState(false)
  
  // Guardian registration transaction tracking
  const [guardianTxHash, setGuardianTxHash] = useState<`0x${string}` | undefined>(undefined)
  
  // Recovery owner change addresses
  const [oldOwnerAddress, setOldOwnerAddress] = useState("")
  const [newOwnerAddress, setNewOwnerAddress] = useState("")
  
  // Enable module state
  const [enableModuleLoading, setEnableModuleLoading] = useState(false)
  const [enableModuleMessage, setEnableModuleMessage] = useState("")
  const [enableModuleTxHash, setEnableModuleTxHash] = useState<`0x${string}` | undefined>(undefined)
  
  // Track guardian registration transaction status  
  const { 
    isLoading: isGuardianTxConfirming, 
    isSuccess: isGuardianTxConfirmed 
  } = useWaitForTransactionReceipt({
    hash: guardianTxHash,
  })

  // Track enable module transaction status
  const { 
    isLoading: isEnableModuleTxConfirming, 
    isSuccess: isEnableModuleTxConfirmed 
  } = useWaitForTransactionReceipt({
    hash: enableModuleTxHash,
  })

  const zkPassportRef = useRef<ZKPassport | null>(null)



  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport()
    }
  }, [])

  // Monitor transaction status for recovery
  useEffect(() => {
    if (hash) {
      console.log("Transaction hash:", hash)
      setRecoveryMessage(`Transaction submitted! Hash: ${hash}`)
    }
  }, [hash])

  useEffect(() => {
    if (isConfirming) {
      console.log("Transaction confirming...")
      setRecoveryMessage("Transaction confirming...")
    }
  }, [isConfirming])

  useEffect(() => {
    if (isConfirmed) {
      console.log("Transaction confirmed!")
      setRecoveryMessage("Transaction confirmed successfully!")
      setRecoveryInProgress(false)
      
      // Automatically refresh Safe information after successful transaction
      setTimeout(() => {
        handleLoad()
        console.log("Safe information refreshed after transaction confirmation")
      }, 2000)
    }
  }, [isConfirmed, handleLoad])

  useEffect(() => {
    if (writeError) {
      console.error("Transaction error:", writeError)
      setRecoveryMessage(`Transaction failed: ${writeError.message}`)
      setRecoveryInProgress(false)
    }
  }, [writeError])

  // Monitor guardian registration transaction status
  useEffect(() => {
    if (guardianTxHash) {
      console.log("Guardian registration transaction hash:", guardianTxHash)
      setMessage(`Guardian registration transaction submitted! Hash: ${guardianTxHash}`)
    }
  }, [guardianTxHash])

  useEffect(() => {
    if (isGuardianTxConfirming) {
      console.log("Guardian registration transaction confirming...")
      setMessage("Guardian registration transaction confirming...")
    }
  }, [isGuardianTxConfirming])

  useEffect(() => {
    if (isGuardianTxConfirmed) {
      console.log("Guardian registration transaction confirmed!")
      setMessage("Guardian registration confirmed successfully!")
      setRequestInProgress(false)
      
      // Automatically refresh Safe information after successful guardian registration
      setTimeout(() => {
        handleLoad()
        console.log("Safe information refreshed after guardian registration confirmation")
      }, 2000)
    }
  }, [isGuardianTxConfirmed, handleLoad])

  // Monitor enable module transaction status
  useEffect(() => {
    if (enableModuleTxHash) {
      console.log("Enable module transaction hash:", enableModuleTxHash)
      setEnableModuleMessage(`Enable module transaction submitted! Hash: ${enableModuleTxHash}`)
    }
  }, [enableModuleTxHash])

  useEffect(() => {
    if (isEnableModuleTxConfirming) {
      console.log("Enable module transaction confirming...")
      setEnableModuleMessage("Enable module transaction confirming...")
    }
  }, [isEnableModuleTxConfirming])

  useEffect(() => {
    if (isEnableModuleTxConfirmed) {
      console.log("Enable module transaction confirmed!")
      setEnableModuleMessage("ZK Module enabled successfully!")
      setEnableModuleLoading(false)
      
      // Automatically refresh Safe information after successful module enablement
      setTimeout(() => {
        handleLoad()
        console.log("Safe information refreshed after enable module confirmation")
      }, 2000)
    }
  }, [isEnableModuleTxConfirmed, handleLoad])

  const handleEnableModule = async () => {
    if (!account.address || !safeInfo) {
      setEnableModuleMessage("Error: No wallet connected or Safe not loaded")
      return
    }

    // Check if user is a Safe owner
    if (!isConnectedAddressOwner()) {
      setEnableModuleMessage("Error: Only Safe owners can enable modules")
      return
    }

    setEnableModuleLoading(true)
    setEnableModuleMessage("")
    setEnableModuleTxHash(undefined) // Reset previous tracking

    try {
      const provider = await account.connector?.getProvider()
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      })

      // Create transaction to enable the module
      const safeTransactionData: MetaTransactionData = {
        to: safeInfo.address,
        value: '0',
        data: encodeFunctionData({
          abi: [
            {
              "inputs": [{"internalType": "address", "name": "module", "type": "address"}],
              "name": "enableModule",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          functionName: "enableModule",
          args: [ZK_MODULE_ADDRESS]
        }),
        operation: OperationType.Call
      }

      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]})
      const txResponse = await protocolKit.signTransaction(transaction)
      console.log("Enable module transaction signed:", txResponse)
      
      const executeTxResponse = await protocolKit.executeTransaction(transaction)
      const txHash = executeTxResponse.hash
      console.log("Enable module transaction executed:", executeTxResponse)
      
      // Start tracking the enable module transaction
      if (txHash) {
        setEnableModuleTxHash(txHash as `0x${string}`)
      }
      
    } catch (err) {
      console.error("Error enabling module:", err)
      setEnableModuleMessage("Error enabling module: " + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setEnableModuleLoading(false)
    }
  }

  const handleCreateGuardian = async () => {
    if (!zkPassportRef.current) {
      return
    }
    
    // Check if connected address is a Safe owner before creating request
    if (!isConnectedAddressOwner()) {
      setMessage("Error: Only Safe owners can register modules")
      return
    }
    
    setMessage("")
    setQueryUrl("")
    setUniqueIdentifier("")
    setVerified(undefined)
    setGuardianTxHash(undefined) // Reset previous transaction tracking

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of humanhood",
      mode: "compressed-evm",
      devMode: false,
    })

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia")

    console.log(address, functionName, abi)
    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
    .bind('user_address', safeInfo!.address)
      .done()

    setQueryUrl(url)
    console.log(url)

    setRequestInProgress(true)

    onRequestReceived(() => {
      console.log("QR code scanned")
      setMessage("Request received")
    })

    onGeneratingProof(() => {
      console.log("Generating proof")
      setMessage("Generating proof...")
    })

    let proof: ProofResult | undefined

    onProofGenerated((result: ProofResult) => {
      console.log("Proof result", result)
      proof = result
      setMessage(`Proofs received`)
      setRequestInProgress(false)
    })

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Result", result)
      console.log("Unique identifier", uniqueIdentifier)
      console.log("Verified", verified)
      console.log("Query result errors", queryResultErrors)

      // Check if connected address is a Safe owner before proceeding
      if (!isConnectedAddressOwner()) {
        console.error("Access denied: Only Safe owners can register modules")
        setMessage("Error: Only Safe owners can register modules")
        setRequestInProgress(false)
        return
      }

      const provider = await account.connector?.getProvider()
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      })

      // Get verification parameters
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: proof!,
        devMode: false,
      })

      const safeTransactionData: MetaTransactionData = {
        to: ZK_MODULE_ADDRESS,
        value: '0', // 1 wei
        data: encodeFunctionData({
          abi: ZK_MODULE_ABI,
          functionName: "register",
          // @ts-ignore-next-line
          args: [verifierParams]
        }),
        operation: OperationType.Call
      }

      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]})
      await protocolKit.signTransaction(transaction)
      const executeTxResponse = await protocolKit.executeTransaction(transaction)
      const txHash = executeTxResponse.hash
      console.log("Execute transaction response", executeTxResponse)
      
      // Start tracking the guardian registration transaction
      if (txHash) {
        setGuardianTxHash(txHash as `0x${string}`)
      }
      
      console.log("Result of the query", result)
      console.log("Query result errors", queryResultErrors)
      setMessage("Result received")
      setUniqueIdentifier(uniqueIdentifier || "")
      setVerified(verified)
      setRequestInProgress(false)
    })

    onReject(() => {
      console.log("User rejected")
      setMessage("User rejected the request")
      setRequestInProgress(false)
    })

    onError((error: unknown) => {
      console.error("Error", error)
      setMessage("An error occurred")
      setRequestInProgress(false)
    })
  }

  const handleRecovery = async () => {
    if (!zkPassportRef.current) {
      return
    }
    
    // Reset recovery state
    setRecoveryMessage("")
    setRecoveryQueryUrl("")
    setRecoveryUniqueIdentifier("")
    setRecoveryVerified(undefined)

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Safe Recovery - Verify your identity to recover access",
      mode: "compressed-evm",
      devMode: false,
    })

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia")

    console.log("Recovery verifier details:", address, functionName, abi)
    
    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
      .bind('user_address', newOwnerAddress)
      .done()

    setRecoveryQueryUrl(url)
    console.log("Recovery QR URL:", url)

    setRecoveryInProgress(true)

    onRequestReceived(() => {
      console.log("Recovery QR code scanned")
      setRecoveryMessage("Recovery request received")
    })

    onGeneratingProof(() => {
      console.log("Generating recovery proof")
      setRecoveryMessage("Generating recovery proof...")
    })

    let recoveryProof: ProofResult | undefined

    onProofGenerated((result: ProofResult) => {
      console.log("Recovery proof result", result)
      recoveryProof = result
      setRecoveryMessage("Recovery proof received")
      setRecoveryInProgress(false)
    })

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Recovery result", result)
      console.log("Recovery unique identifier", uniqueIdentifier)
      console.log("Recovery verified", verified)
      console.log("Recovery query result errors", queryResultErrors)

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
        validityPeriodInDays: BigInt(verifierParams.validityPeriodInDays)
      }

      try {
        // Validate addresses
        if (!oldOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid current owner address format")
          setRecoveryInProgress(false)
          return
        }

        if (!newOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid new owner address format")
          setRecoveryInProgress(false)
          return
        }

        // Execute recovery transaction using wagmi with actual addresses
        await writeContract({
          address: ZK_MODULE_ADDRESS as `0x${string}`,
          abi: ZK_MODULE_ABI,
          functionName: 'recover',
          // @ts-ignore - Type compatibility between ZKPassport SDK and wagmi
          args: [
            wagmiVerifierParams,
            ethereumAddress as `0x${string}`, 
            oldOwnerAddress as `0x${string}`, 
            WITNESS_ADDRESS as `0x${string}`, 
          ],
        })

        console.log("Recovery transaction submitted successfully")
        setRecoveryMessage("Recovery transaction submitted - waiting for confirmation")
        
      } catch (err) {
        console.error("Recovery transaction failed:", err)
        setRecoveryMessage("Recovery transaction failed: " + (err instanceof Error ? err.message : 'Unknown error'))
        setRecoveryInProgress(false)
        return
      }

      setRecoveryUniqueIdentifier(uniqueIdentifier || "")
      setRecoveryVerified(verified)
      setRecoveryInProgress(false)
    })

    onReject(() => {
      console.log("Recovery request rejected")
      setRecoveryMessage("Recovery request was rejected")
      setRecoveryInProgress(false)
    })

    onError((error: unknown) => {
      console.error("Recovery error", error)
      setRecoveryMessage("An error occurred during recovery")
      setRecoveryInProgress(false)
    })
  }

  // Prevent hydration errors by ensuring consistent rendering
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug hydration issues
  if (typeof window !== 'undefined' && !mounted) {
    console.log('ZKPassportSection: Client-side, not yet mounted')
  }

  if (!safeInfo) {
    console.log('ZKPassportSection: No safeInfo available')
    return null
  }

  if (!mounted) {
    console.log('ZKPassportSection: Not mounted yet, returning placeholder for SSR')
    // Return a placeholder with the same structure to prevent hydration mismatch
    return (
      <section className={styles.zkpassportSection}>
        <div className={styles.zkpassportContainer}>
          <h2 className={styles.zkpassportTitle}>
            ZK-Passport
          </h2>
          <p className={styles.zkpassportDescription}>
            Loading...
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.zkpassportSection} suppressHydrationWarning>
      <div className={styles.zkpassportContainer} suppressHydrationWarning>
        <h2 className={styles.zkpassportTitle}>
          ZK-Passport
        </h2>
        <p className={styles.zkpassportDescription}>
          Secure identity verification and recovery using Zero-Knowledge proofs
        </p>

        {/* Enable Module Card - Only show if ZK module is NOT enabled */}
        {mounted && !safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
          <div className={styles.zkpassportCard}>
            <h3 className={styles.zkpassportCardTitle}>
              Enable ZK Recovery Module
            </h3>
            <p className={styles.zkpassportCardDescription}>
              Enable the ZK Recovery Module on your Safe to use ZK-Passport features
            </p>
            
            {!isConnectedAddressOwner() && (
              <div className={styles.zkpassportError}>
                <strong>⚠️ Access Denied:</strong> Only Safe owners can enable modules.
                <br />
                <small>Connect with an owner wallet address to continue.</small>
              </div>
            )}

            {!isConnectedToSepolia() && (
              <div className={styles.zkpassportError}>
                <strong>⚠️ Wrong Network:</strong> Module enablement requires Sepolia Testnet.
                <br />
                <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleEnableModule}
              disabled={enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia()}
              className={`${styles.zkpassportButton} ${
                enableModuleLoading || isEnableModuleTxConfirming 
                  ? styles.zkpassportButtonLoading
                  : !isConnectedToSepolia() || !isConnectedAddressOwner()
                  ? styles.zkpassportButtonError 
                  : styles.zkpassportButtonPrimary
              }`}
            >
              {!isConnectedToSepolia() ? 'Wrong Network' :
               isEnableModuleTxConfirming ? 'Confirming Transaction...' :
               enableModuleLoading ? 'Enabling Module...' : 
               !isConnectedAddressOwner() ? 'Owner Access Required' : 'Enable ZK Recovery Module'}
            </button>

            {enableModuleMessage && (
              <div className={`${styles.zkpassportMessage} ${enableModuleMessage.includes('Error') ? styles.zkpassportMessageError : styles.zkpassportMessageInfo}`}>
                {enableModuleMessage}
              </div>
            )}

            {/* Enable Module Transaction Status Indicator */}
            {(enableModuleTxHash && (isEnableModuleTxConfirming || isEnableModuleTxConfirmed)) && (
              <div className={`${styles.zkpassportStatus} ${isEnableModuleTxConfirmed ? styles.zkpassportStatusSuccess : styles.zkpassportStatusPending}`}>
                <div className={styles.zkpassportStatusIndicator}></div>
                <span>
                  {isEnableModuleTxConfirming && '🔄 Confirming module activation on network...'}
                  {isEnableModuleTxConfirmed && '✅ Module activation confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Guardian Registration Card - Only show if ZK module is enabled */}
        {mounted && safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
          <div className={styles.zkpassportCard}>
            <h3 className={styles.zkpassportCardTitle}>Register Guardian</h3>
            <p className={styles.zkpassportCardDescription}>Verify your identity to register as a recovery guardian for this Safe</p>
            
            {!isConnectedAddressOwner() && (
              <div className={styles.zkpassportError}>
                <strong>⚠️ Access Denied:</strong> Only Safe owners can register guardians.
                <br />
                <small>Connect with an owner wallet address to continue.</small>
              </div>
            )}

            {!isConnectedToSepolia() && (
              <div className={styles.zkpassportError}>
                <strong>⚠️ Wrong Network:</strong> ZK-Passport requires Sepolia Testnet.
                <br />
                <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleCreateGuardian}
              disabled={requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia()}
              className={`${styles.zkpassportButton} ${
                requestInProgress || isGuardianTxConfirming
                  ? styles.zkpassportButtonLoading
                  : (!isConnectedAddressOwner() || !isConnectedToSepolia())
                  ? styles.zkpassportButtonError
                  : styles.zkpassportButtonPrimary
              }`}
            >
              {!isConnectedToSepolia() ? 'Wrong Network' :
               isGuardianTxConfirming ? 'Confirming Transaction...' :
               requestInProgress ? 'Processing...' : 
               !isConnectedAddressOwner() ? 'Owner Access Required' :
               queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
            </button>

            {queryUrl && (
              <div className={styles.zkpassportQrContainer}>
                <p className={styles.zkpassportQrText}>Scan with ZKPassport app:</p>
                <QRCode value={queryUrl} size={200} />
              </div>
            )}

            {message && (
              <div className={`${styles.zkpassportMessage} ${message.includes('Error') ? styles.zkpassportMessageError : styles.zkpassportMessageInfo}`}>
                {message}
              </div>
            )}

            {/* Guardian Transaction Status Indicator */}
            {(guardianTxHash && (isGuardianTxConfirming || isGuardianTxConfirmed)) && (
              <div className={`${styles.zkpassportStatus} ${isGuardianTxConfirmed ? styles.zkpassportStatusSuccess : styles.zkpassportStatusPending}`}>
                <div className={styles.zkpassportStatusIndicator}></div>
                <span>
                  {isGuardianTxConfirming && '🔄 Confirming guardian registration on network...'}
                  {isGuardianTxConfirmed && '✅ Guardian registration confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}

            {uniqueIdentifier && (
              <div className={styles.zkpassportIdentifier}>
                <p className={styles.zkpassportIdentifierLabel}>Unique Identifier:</p>
                <p className={styles.zkpassportIdentifierValue}>{uniqueIdentifier}</p>
              </div>
            )}

            {verified !== undefined && (
              <div className={`${styles.zkpassportMessage} ${verified ? styles.zkpassportStatusSuccess : styles.zkpassportMessageError}`}>
                <strong>Verification Status:</strong> {verified ? '✅ Verified' : '❌ Failed'}
              </div>
            )}
          </div>
        )}

        {/* Recovery Section - Only show if ZK module is enabled AND a guardian has been registered for this Safe */}
        {mounted && safeInfo.modules.includes(ZK_MODULE_ADDRESS) && isSafeRegisteredForRecovery() && (
          <div className={styles.zkpassportCard}>
            <h3 className={styles.zkpassportCardTitle}>Safe Recovery</h3>
            <p className={styles.zkpassportCardDescription}>This Safe is registered for recovery. Verify your identity to recover access.</p>
            
            {/* Recovery Status */}
            <div className={styles.zkpassportRecoveryStatus}>
              <div className={styles.zkpassportRecoveryStatusHeader}>
                <div className={styles.zkpassportRecoveryStatusDot}></div>
                <span className={styles.zkpassportRecoveryStatusLabel}>Recovery Available</span>
              </div>
              <p className={styles.zkpassportRecoveryStatusId}>ID: {recovererUniqueId}</p>
            </div>

            {/* Recovery Form */}
            <div className={styles.zkpassportInputGroup}>
              <div className={styles.zkpassportInputGroup}>
                <label className={styles.zkpassportInputLabel}>Current Owner Address (to be replaced):</label>
                <input
                  type="text"
                  value={oldOwnerAddress}
                  onChange={(e) => setOldOwnerAddress(e.target.value)}
                  placeholder="Enter current owner address (0x...)"
                  className={`${styles.zkpassportInput} ${oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? styles.zkpassportInputInvalid : ''}`}
                  disabled={recoveryInProgress || isPending || isConfirming}
                />
                {oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) && (
                  <p className={styles.zkpassportInputError}>Invalid address format. Must be 42 characters starting with 0x.</p>
                )}
              </div>

              <div className={styles.zkpassportInputGroup}>
                <label className={styles.zkpassportInputLabel}>New Owner Address (replacement):</label>
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="Enter new owner address (0x...)"
                  className={`${styles.zkpassportInput} ${newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? styles.zkpassportInputInvalid : ''}`}
                  disabled={recoveryInProgress || isPending || isConfirming}
                />
                {newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) && (
                  <p className={styles.zkpassportInputError}>Invalid address format. Must be 42 characters starting with 0x.</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecovery}
              disabled={recoveryInProgress || isPending || isConfirming || readLoading || 
                       !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                       !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ||
                       !isConnectedToSepolia()}
              className={`${styles.zkpassportButton} ${
                recoveryInProgress || isPending || isConfirming
                  ? styles.zkpassportButtonLoading
                  : (readLoading ||
                     !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                     !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ||
                     !isConnectedToSepolia())
                  ? styles.zkpassportButtonDisabled
                  : styles.zkpassportButtonPrimary
              }`}
            >
              {!isConnectedToSepolia() ? 'Wrong Network' :
               !oldOwnerAddress.trim() || !newOwnerAddress.trim() ? 'Enter Owner Addresses' :
               (oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress)) || (newOwnerAddress && !isValidEthereumAddress(newOwnerAddress)) ? 'Invalid Address Format' :
               isPending ? 'Sign Transaction in Wallet...' :
               isConfirming ? 'Confirming Transaction...' :
               recoveryInProgress ? 'Processing Recovery...' : 
               readLoading ? 'Loading...' : 
               recoveryQueryUrl ? 'Generate New Recovery Request' : 'Start Recovery Process'}
            </button>

            {/* Recovery QR Code */}
            {recoveryQueryUrl && (
              <div className={styles.zkpassportQrContainer}>
                <p className={styles.zkpassportQrText}>Scan with ZKPassport app to verify your identity for recovery:</p>
                <QRCode value={recoveryQueryUrl} size={200} />
              </div>
            )}

            {/* Recovery Messages */}
            {recoveryMessage && (
              <div className={`${styles.zkpassportMessage} ${(recoveryMessage.includes('Error') || recoveryMessage.includes('failed')) ? styles.zkpassportMessageError : styles.zkpassportMessageInfo}`}>
                {recoveryMessage}
              </div>
            )}

            {/* Transaction Status Indicator */}
            {(isPending || isConfirming || isConfirmed) && (
              <div className={`${styles.zkpassportStatus} ${isConfirmed ? styles.zkpassportStatusSuccess : styles.zkpassportStatusPending}`}>
                <div className={styles.zkpassportStatusIndicator}></div>
                <span>
                  {isPending && '⏳ Waiting for wallet signature...'}
                  {isConfirming && '🔄 Confirming transaction on network...'}
                  {isConfirmed && '✅ Transaction confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}

            {/* Recovery Results */}
            {recoveryUniqueIdentifier && (
              <div className={styles.zkpassportIdentifier}>
                <p className={styles.zkpassportIdentifierLabel}>Recovery Unique Identifier:</p>
                <p className={styles.zkpassportIdentifierValue}>{recoveryUniqueIdentifier}</p>
              </div>
            )}

            {recoveryVerified !== undefined && (
              <div className={`${styles.zkpassportMessage} ${recoveryVerified ? styles.zkpassportStatusSuccess : styles.zkpassportMessageError}`}>
                <strong>Recovery Verification Status:</strong> {recoveryVerified ? '✅ Verified' : '❌ Failed'}
              </div>
            )}
          </div>
        )}

        {/* Info message when module is enabled but no guardian is registered */}
        {mounted && safeInfo.modules.includes(ZK_MODULE_ADDRESS) && !isSafeRegisteredForRecovery() && !readLoading && (
          <div className={styles.zkpassportInfoCard}>
            <div className={styles.zkpassportInfoContent}>
              <div className={styles.zkpassportInfoIcon}>
                🛡️
              </div>
              <h4 className={styles.zkpassportInfoTitle}>
                No Recovery Guardian Set
              </h4>
              <p className={styles.zkpassportInfoDescription}>
                Register a guardian above to enable Safe recovery functionality.
              </p>
              <p className={styles.zkpassportInfoNote}>
                Once registered, you'll be able to recover access to this Safe using ZK identity verification.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ZKPassportSection