'use client'

import { useEffect, useRef, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ZKPassport, ProofResult } from "@zkpassport/sdk"
import Safe, { Eip1193Provider } from '@safe-global/protocol-kit'
import QRCode from "react-qr-code"
import { MetaTransactionData, OperationType } from '@safe-global/types-kit'
import { encodeFunctionData } from 'viem'
import { isValidEthereumAddress } from '../utils/safeHelpers'

const ZK_MODULE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifierAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "vkeyHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes",
            "name": "proof",
            "type": "bytes"
          },
          {
            "internalType": "bytes32[]",
            "name": "publicInputs",
            "type": "bytes32[]"
          },
          {
            "internalType": "bytes",
            "name": "committedInputs",
            "type": "bytes"
          },
          {
            "internalType": "uint256[]",
            "name": "committedInputCounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "validityPeriodInDays",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "domain",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "scope",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "devMode",
            "type": "bool"
          }
        ],
        "internalType": "struct ProofVerificationParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "oldOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      }
    ],
    "name": "recover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "vkeyHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes",
            "name": "proof",
            "type": "bytes"
          },
          {
            "internalType": "bytes32[]",
            "name": "publicInputs",
            "type": "bytes32[]"
          },
          {
            "internalType": "bytes",
            "name": "committedInputs",
            "type": "bytes"
          },
          {
            "internalType": "uint256[]",
            "name": "committedInputCounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "validityPeriodInDays",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "domain",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "scope",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "devMode",
            "type": "bool"
          }
        ],
        "internalType": "struct ProofVerificationParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      }
    ],
    "name": "register",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "safeToRecoverer",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "zkPassportVerifier",
    "outputs": [
      {
        "internalType": "contract IZKPassportVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const ZK_MODULE_ADDRESS = '0x2D2D70C1dC1DDEA79368F0D708fa5Ea125e59B31'
const WITNESS_ADDRESS = '0x0000000000000000000000000000000000000001'

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

  const createRequest = async () => {
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
    // .disclose('birthdate')
    // .eq('birthdate', new D ate('1990-01-01'))
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
        // Use the same scope as the one you specified with the request function
        // Enable dev mode if you want to use mock passports, otherwise keep it false
        devMode: false,
      })

      const safeTransactionData: MetaTransactionData = {
        to: ZK_MODULE_ADDRESS,
        value: '0', // 1 wei
        data: encodeFunctionData({
          abi: ZK_MODULE_ABI,
          functionName: "register",
          // @ts-ignore-next-line
          args: [verifierParams, safeInfo!.address]
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
      // Same settings as createRequest - can add specific disclosures here if needed
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
            ethereumAddress as `0x${string}`, // safeAddress
            oldOwnerAddress as `0x${string}`, // oldOwner (from input)
            newOwnerAddress as `0x${string}`, // newOwner (from input)
            WITNESS_ADDRESS as `0x${string}`, // previousOwner (needs Safe owner list knowledge)
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

  if (!safeInfo) {
    return null
  }

  return (
    <section>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          ZK-Passport
        </h2>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '24px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Secure identity verification and recovery using Zero-Knowledge proofs
        </p>

        {/* Enable Module Card - Only show if ZK module is NOT enabled */}
        {!safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Enable ZK Recovery Module
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
              Enable the ZK Recovery Module on your Safe to use ZK-Passport features
            </p>
            
            {!isConnectedAddressOwner() && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                marginBottom: '16px',
                color: '#991b1b'
              }}>
                <strong>⚠️ Access Denied:</strong> Only Safe owners can enable modules.
                <br />
                <small>Connect with an owner wallet address to continue.</small>
              </div>
            )}

            {!isConnectedToSepolia() && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                marginBottom: '16px',
                color: '#991b1b'
              }}>
                <strong>⚠️ Wrong Network:</strong> Module enablement requires Sepolia Testnet.
                <br />
                <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleEnableModule}
              disabled={enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia()}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia() ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}
            >
              {!isConnectedToSepolia() ? 'Wrong Network' :
               isEnableModuleTxConfirming ? 'Confirming Transaction...' :
               enableModuleLoading ? 'Enabling Module...' : 
               !isConnectedAddressOwner() ? 'Owner Access Required' : 'Enable ZK Recovery Module'}
            </button>

            {enableModuleMessage && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: enableModuleMessage.includes('Error') ? '#fef2f2' : '#f0f9ff',
                border: `1px solid ${enableModuleMessage.includes('Error') ? '#fecaca' : '#bfdbfe'}`,
                color: enableModuleMessage.includes('Error') ? '#991b1b' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {enableModuleMessage}
              </div>
            )}

            {/* Enable Module Transaction Status Indicator */}
            {(enableModuleTxHash && (isEnableModuleTxConfirming || isEnableModuleTxConfirmed)) && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isEnableModuleTxConfirmed ? '#ecfdf5' : '#f0f9ff',
                border: `1px solid ${isEnableModuleTxConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                color: isEnableModuleTxConfirmed ? '#065f46' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isEnableModuleTxConfirmed ? '#10b981' : '#3b82f6',
                  opacity: !isEnableModuleTxConfirmed ? 0.7 : 1
                }}></div>
                <span>
                  {isEnableModuleTxConfirming && '🔄 Confirming module activation on network...'}
                  {isEnableModuleTxConfirmed && '✅ Module activation confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Guardian Registration Card - Only show if ZK module is enabled */}
        {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Register Guardian
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
              Verify your identity to register as a recovery guardian for this Safe
            </p>
            
            {!isConnectedAddressOwner() && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                marginBottom: '16px',
                color: '#991b1b'
              }}>
                <strong>⚠️ Access Denied:</strong> Only Safe owners can register guardians.
                <br />
                <small>Connect with an owner wallet address to continue.</small>
              </div>
            )}

            {!isConnectedToSepolia() && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                marginBottom: '16px',
                color: '#991b1b'
              }}>
                <strong>⚠️ Wrong Network:</strong> ZK-Passport requires Sepolia Testnet.
                <br />
                <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
              </div>
            )}
            
            <button
              type="button"
              onClick={createRequest}
              disabled={requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia()}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia() ? '#9ca3af' : '#10b981',
                color: 'white',
                cursor: requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() || !isConnectedToSepolia() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}
            >
              {!isConnectedToSepolia() ? 'Wrong Network' :
               isGuardianTxConfirming ? 'Confirming Transaction...' :
               requestInProgress ? 'Processing...' : 
               !isConnectedAddressOwner() ? 'Owner Access Required' :
               queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
            </button>

            {queryUrl && (
              <div style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <p style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                  Scan with ZKPassport app:
                </p>
                <QRCode value={queryUrl} size={200} />
              </div>
            )}

            {message && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0f9ff',
                border: `1px solid ${message.includes('Error') ? '#fecaca' : '#bfdbfe'}`,
                color: message.includes('Error') ? '#991b1b' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {message}
              </div>
            )}

            {/* Guardian Transaction Status Indicator */}
            {(guardianTxHash && (isGuardianTxConfirming || isGuardianTxConfirmed)) && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isGuardianTxConfirmed ? '#ecfdf5' : '#f0f9ff',
                border: `1px solid ${isGuardianTxConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                color: isGuardianTxConfirmed ? '#065f46' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isGuardianTxConfirmed ? '#10b981' : '#3b82f6',
                  opacity: !isGuardianTxConfirmed ? 0.7 : 1
                }}></div>
                <span>
                  {isGuardianTxConfirming && '🔄 Confirming guardian registration on network...'}
                  {isGuardianTxConfirmed && '✅ Guardian registration confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}

            {uniqueIdentifier && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                  Unique Identifier:
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  fontFamily: 'monospace', 
                  color: '#64748b',
                  wordBreak: 'break-all',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  {uniqueIdentifier}
                </p>
              </div>
            )}

            {verified !== undefined && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: verified ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${verified ? '#d1fae5' : '#fecaca'}`,
                color: verified ? '#065f46' : '#991b1b',
                fontSize: '14px'
              }}>
                <strong>Verification Status:</strong> {verified ? "✅ Verified" : "❌ Failed"}
              </div>
            )}
          </div>
        )}

        {/* Recovery Section - Only show if ZK module is enabled AND a guardian has been registered for this Safe */}
        {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && isSafeRegisteredForRecovery() && (
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Safe Recovery
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
              This Safe is registered for recovery. Verify your identity to recover access.
            </p>
            
            {/* Recovery Status */}
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #10b981',
              backgroundColor: '#ecfdf5',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }}></div>
                <span style={{
                  fontWeight: '600',
                  color: '#065f46',
                  fontSize: '14px'
                }}>
                  Recovery Available
                </span>
              </div>
              <p style={{ 
                margin: '8px 0 0 0', 
                fontSize: '12px', 
                fontFamily: 'monospace', 
                color: '#059669',
                wordBreak: 'break-all'
              }}>
                ID: {recovererUniqueId}
              </p>
            </div>

            {/* Recovery Form */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Current Owner Address (to be replaced):
                </label>
                <input
                  type="text"
                  value={oldOwnerAddress}
                  onChange={(e) => setOldOwnerAddress(e.target.value)}
                  placeholder="Enter current owner address (0x...)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    backgroundColor: oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#fef2f2' : 'white',
                    color: '#000000'
                  }}
                  disabled={recoveryInProgress || isPending || isConfirming}
                />
                {oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', margin: '4px 0 0 0' }}>
                    Invalid address format. Must be 42 characters starting with 0x.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  New Owner Address (replacement):
                </label>
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="Enter new owner address (0x...)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    backgroundColor: newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#fef2f2' : 'white',
                    color: '#000000'
                  }}
                  disabled={recoveryInProgress || isPending || isConfirming}
                />
                {newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', margin: '4px 0 0 0' }}>
                    Invalid address format. Must be 42 characters starting with 0x.
                  </p>
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
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: recoveryInProgress || isPending || isConfirming || readLoading || 
                                 !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                                 !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ||
                                 !isConnectedToSepolia()
                                 ? '#9ca3af' : '#10b981',
                color: 'white',
                cursor: recoveryInProgress || isPending || isConfirming || readLoading || 
                        !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                        !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ||
                        !isConnectedToSepolia()
                        ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px'
              }}
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
              <div style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <p style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                  Scan with ZKPassport app to verify your identity for recovery:
                </p>
                <QRCode value={recoveryQueryUrl} size={200} />
              </div>
            )}

            {/* Recovery Messages */}
            {recoveryMessage && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#fef2f2' : '#f0f9ff',
                border: `1px solid ${recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#fecaca' : '#bfdbfe'}`,
                color: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#991b1b' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {recoveryMessage}
              </div>
            )}

            {/* Transaction Status Indicator */}
            {(isPending || isConfirming || isConfirmed) && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isConfirmed ? '#ecfdf5' : '#f0f9ff',
                border: `1px solid ${isConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                color: isConfirmed ? '#065f46' : '#1e40af',
                fontSize: '14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConfirmed ? '#10b981' : isPending ? '#f59e0b' : '#3b82f6',
                  opacity: !isConfirmed ? 0.7 : 1
                }}></div>
                <span>
                  {isPending && '⏳ Waiting for wallet signature...'}
                  {isConfirming && '🔄 Confirming transaction on network...'}
                  {isConfirmed && '✅ Transaction confirmed! Safe info will refresh shortly.'}
                </span>
              </div>
            )}

            {/* Recovery Results */}
            {recoveryUniqueIdentifier && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                  Recovery Unique Identifier:
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  fontFamily: 'monospace', 
                  color: '#64748b',
                  wordBreak: 'break-all',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  {recoveryUniqueIdentifier}
                </p>
              </div>
            )}

            {recoveryVerified !== undefined && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: recoveryVerified ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${recoveryVerified ? '#d1fae5' : '#fecaca'}`,
                color: recoveryVerified ? '#065f46' : '#991b1b',
                fontSize: '14px'
              }}>
                <strong>Recovery Verification Status:</strong> {recoveryVerified ? "✅ Verified" : "❌ Failed"}
              </div>
            )}
          </div>
        )}

        {/* Info message when module is enabled but no guardian is registered */}
        {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && !isSafeRegisteredForRecovery() && !readLoading && (
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '8px'
              }}>
                🛡️
              </div>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                No Recovery Guardian Set
              </h4>
              <p style={{
                fontSize: '14px',
                color: '#1e40af',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Register a guardian above to enable Safe recovery functionality.
              </p>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: '0'
              }}>
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