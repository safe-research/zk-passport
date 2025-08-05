'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import Safe, {
  Eip1193Provider
} from '@safe-global/protocol-kit'
import ZKPassportSection from '../components/ZKPassportSection'
import {
  isConnectedAddressOwner,
  isSafeRegisteredForRecovery,
  isConnectedToSepolia,
  getSepoliaChain,
  switchToSepolia
} from '../utils/safeHelpers'

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

// verifier address: 0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE
// module address: 0x75155d07f805eC2758eF6e2900B11F5988d17424

const ZK_MODULE_ADDRESS = '0x2D2D70C1dC1DDEA79368F0D708fa5Ea125e59B31'
const WITNESS_ADDRESS = '0x0000000000000000000000000000000000000001'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitchingChain } = useSwitchChain()

  const [ethereumAddress, setEthereumAddress] = useState('0x7af06A5E7226075DF00402A556f5529cf6D836CC')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)



  const [safeInfo, setSafeInfo] = useState<{
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null>(null)

  // Read the safeToRecoverer mapping to check if Safe is registered for recovery
  const { data: recovererUniqueId, isError: readError, isLoading: readLoading } = useReadContract({
    address: ZK_MODULE_ADDRESS as `0x${string}`,
    abi: ZK_MODULE_ABI,
    functionName: 'safeToRecoverer',
    args: [ethereumAddress as `0x${string}`],
  })

  const handleLoad = async () => {
    if (!ethereumAddress.trim()) {
      setLoadError('Please enter a Safe address')
      return
    }

    if (!account.address) {
      setLoadError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setLoadError(null)
    setSafeInfo(null)
    const provider = await account.connector?.getProvider()
    try {
      // Initialize the Protocol Kit with the existing Safe address
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress.trim()
      })

      // Check if the Safe is deployed
      const isDeployed = await protocolKit.isSafeDeployed()

      if (!isDeployed) {
        setLoadError('Safe not found at this address or not deployed')
        return
      }

      // Get Safe information
      const safeAddress = await protocolKit.getAddress()
      const owners = await protocolKit.getOwners()
      const threshold = await protocolKit.getThreshold()
      const modules = await protocolKit.getModules()

      setSafeInfo({
        address: safeAddress,
        owners,
        threshold,
        isDeployed,
        modules
      })

      console.log('Safe loaded successfully:', {
        address: safeAddress,
        owners,
        threshold,
        isDeployed
      })

    } catch (err) {
      console.error('Error loading Safe:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load Safe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px 0'
      }}>
        {/* Main Container */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Safe Recovery Module
            </h1>
            <p style={{
              fontSize: '18px',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Secure Safe wallet recovery using ZKPassport identity verification
            </p>
          </div>

          {/* Main Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: account.status === 'connected' && safeInfo ? '1fr 1fr' : '1fr',
            gap: '30px',
            alignItems: 'start'
          }}>
            {/* Left Column - Connection & Safe Loading */}
            <div>
              {/* Connection Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: account.status === 'connected' ? '#10b981' : '#ef4444'
                  }}></div>
                  Wallet Connection
                </h2>

                {account.status === 'connected' ? (
                  <div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#ecfdf5',
                      borderRadius: '8px',
                      border: '1px solid #d1fae5',
                      marginBottom: '16px'
                    }}>
                      <p style={{ margin: '0', color: '#065f46', fontWeight: '500' }}>
                        ✅ Connected to {account.addresses?.[0]?.slice(0, 6)}...{account.addresses?.[0]?.slice(-4)}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                        Chain ID: {account.chainId}
                      </p>
                    </div>

                    {/* Chain Warning - Show when not connected to Sepolia */}
                    {!isConnectedToSepolia(account) && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444'
                          }}></div>
                          <p style={{ margin: '0', color: '#991b1b', fontWeight: '600', fontSize: '14px' }}>
                            ⚠️ Wrong Network
                          </p>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#7f1d1d' }}>
                          Please switch to Sepolia Testnet (Chain ID: 11155111) to use this application.
                        </p>
                        {getSepoliaChain(chains) && (
                          <button
                            type="button"
                            onClick={() => switchToSepolia(chains, switchChain)}
                            disabled={isSwitchingChain}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #dc2626',
                              backgroundColor: isSwitchingChain ? '#9ca3af' : '#dc2626',
                              color: 'white',
                              cursor: isSwitchingChain ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            {isSwitchingChain ? (
                              <>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  border: '2px solid transparent',
                                  borderTop: '2px solid white',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }}></div>
                                Switching...
                              </>
                            ) : (
                              <>
                                🔄 Switch to {getSepoliaChain(chains)?.name}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => disconnect()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #ef4444',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#64748b', marginBottom: '16px' }}>
                      Connect your wallet to get started
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {connectors.map((connector) => (
                        <button
                          key={connector.uid}
                          onClick={() => connect({ connector })}
                          type="button"
                          style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #3b82f6',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          Connect {connector.name}
                        </button>
                      ))}
                    </div>
                    {status && (
                      <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>{status}</p>
                    )}
                    {error?.message && (
                      <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Safe Loading Card */}
              {account.status === 'connected' && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '16px'
                  }}>
                    Load Safe Wallet
                  </h2>
                  <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
                    Enter your Safe wallet address to manage recovery settings
                  </p>

                  {/* Network warning for Safe loading */}
                  {!isConnectedToSepolia(account) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      marginBottom: '16px'
                    }}>
                      <p style={{ margin: '0', fontSize: '12px', color: '#991b1b' }}>
                        ⚠️ Safe loading is disabled. Please switch to Sepolia Testnet to continue.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      value={ethereumAddress}
                      onChange={(e) => setEthereumAddress(e.target.value)}
                      placeholder="Enter Safe address (0x...)"
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                      disabled={loading || !isConnectedToSepolia(account)}
                    />
                    <button
                      type="button"
                      onClick={handleLoad}
                      disabled={loading || !isConnectedToSepolia(account)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: loading || !isConnectedToSepolia(account) ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        cursor: loading || !isConnectedToSepolia(account) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {!isConnectedToSepolia(account) ? 'Wrong Network' : loading ? 'Loading...' : 'Load Safe'}
                    </button>
                  </div>

                  {loadError && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#991b1b',
                      fontSize: '14px'
                    }}>
                      <strong>Error:</strong> {loadError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Safe Information & Actions */}
            {account.status === 'connected' && safeInfo && (
              <div>
                {/* Safe Information Card */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  marginBottom: '24px'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '20px'
                  }}>
                    Safe Information
                  </h2>

                  {/* Safe Details */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Address:</span>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: '#1e293b',
                        wordBreak: 'break-all'
                      }}>
                        {safeInfo.address}
                      </p>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Status:</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1e293b' }}>
                        {safeInfo.isDeployed ? '✅ Deployed' : '❌ Not Deployed'} •
                        Threshold: {safeInfo.threshold}/{safeInfo.owners.length}
                      </p>
                    </div>
                  </div>

                  {/* Wallet Status */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${isConnectedAddressOwner(account, safeInfo) ? '#10b981' : '#ef4444'}`,
                    backgroundColor: isConnectedAddressOwner(account, safeInfo) ? '#ecfdf5' : '#fef2f2',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isConnectedAddressOwner(account, safeInfo) ? '#10b981' : '#ef4444'
                      }}></div>
                      <span style={{
                        fontWeight: '600',
                        color: isConnectedAddressOwner(account, safeInfo) ? '#065f46' : '#991b1b',
                        fontSize: '14px'
                      }}>
                        {isConnectedAddressOwner(account, safeInfo) ? 'SAFE OWNER' : 'NOT OWNER'}
                      </span>
                    </div>
                  </div>

                  {/* Owners List */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                      Owners ({safeInfo.owners.length})
                    </h3>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {safeInfo.owners.map((owner, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px',
                            backgroundColor: account.address && owner.toLowerCase() === account.address.toLowerCase() ? '#f0f9ff' : '#f8fafc',
                            borderRadius: '6px',
                            marginBottom: '4px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ color: '#64748b' }}>{index + 1}.</span>
                          <span style={{ flex: 1, color: '#1e293b' }}>{owner}</span>
                          {account.address && owner.toLowerCase() === account.address.toLowerCase() && (
                            <span style={{
                              fontSize: '12px',
                              color: '#10b981',
                              fontWeight: '600',
                              fontFamily: 'system-ui'
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ZK Module Status */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444'}`,
                    backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#ecfdf5' : '#fef2f2',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444'
                      }}></div>
                      <span style={{
                        fontWeight: '600',
                        color: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#065f46' : '#991b1b',
                        fontSize: '14px'
                      }}>
                        ZK Recovery Module: {safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  </div>


                </div>

                {/* ZK-Passport Section */}
                <ZKPassportSection
                  account={account}
                  safeInfo={safeInfo}
                  ethereumAddress={ethereumAddress}
                  recovererUniqueId={recovererUniqueId}
                  readError={readError}
                  readLoading={readLoading}
                  isConnectedAddressOwner={() => isConnectedAddressOwner(account, safeInfo)}
                  isSafeRegisteredForRecovery={() => isSafeRegisteredForRecovery(recovererUniqueId, readError, readLoading)}
                  isConnectedToSepolia={() => isConnectedToSepolia(account)}
                  handleLoad={handleLoad}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
