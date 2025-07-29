'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import Safe, {
  Eip1193Provider
} from '@safe-global/protocol-kit'
import QRCode from "react-qr-code";
import {
  MetaTransactionData,
  OperationType
} from '@safe-global/types-kit'
import { encodeFunctionData } from 'viem';

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
    "name": "Recover",
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
// module address: 0xeb1277C41D01eB69b091d56Dd59C19C7bf152193

const ZK_MODULE_ADDRESS = '0xeb1277C41D01eB69b091d56Dd59C19C7bf152193'
const WITNESS_ADDRESS = '0x0000000000000000000000000000000000000001'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const [ethereumAddress, setEthereumAddress] = useState('0x7af06A5E7226075DF00402A556f5529cf6D836CC')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState("");
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  
  // Recovery-specific state variables
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryQueryUrl, setRecoveryQueryUrl] = useState("");
  const [recoveryUniqueIdentifier, setRecoveryUniqueIdentifier] = useState("");
  const [recoveryVerified, setRecoveryVerified] = useState<boolean | undefined>(undefined);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  
  // Recovery owner change addresses
  const [oldOwnerAddress, setOldOwnerAddress] = useState("");
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  
  // Enable module state
  const [enableModuleLoading, setEnableModuleLoading] = useState(false);
  const [enableModuleMessage, setEnableModuleMessage] = useState("");
  
  const zkPassportRef = useRef<ZKPassport | null>(null);

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

  // Helper function to check if connected address is a Safe owner
  const isConnectedAddressOwner = () => {
    if (!account.address || !safeInfo) return false;
    return safeInfo.owners.some(owner => 
      owner.toLowerCase() === account.address!.toLowerCase()
    );
  };

  // Helper function to check if Safe is registered for recovery
  const isSafeRegisteredForRecovery = () => {
    return recovererUniqueId && recovererUniqueId !== '0x0000000000000000000000000000000000000000000000000000000000000000';
  };

  // Helper function to validate Ethereum address format
  const isValidEthereumAddress = (address: string) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) !== null;
  };

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport();
    }
  }, []);

  // Monitor transaction status for recovery
  useEffect(() => {
    if (hash) {
      console.log("Recovery transaction hash:", hash);
      setRecoveryMessage(`Recovery transaction confirmed! Hash: ${hash}`);
      setRecoveryInProgress(false);
    }
  }, [hash]);

  useEffect(() => {
    if (writeError) {
      console.error("Recovery transaction error:", writeError);
      setRecoveryMessage(`Recovery transaction failed: ${writeError.message}`);
      setRecoveryInProgress(false);
    }
  }, [writeError]);

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    
    // Check if connected address is a Safe owner before creating request
    if (!isConnectedAddressOwner()) {
      setMessage("Error: Only Safe owners can register modules");
      return;
    }
    
    setMessage("");
    setQueryUrl("");
    setUniqueIdentifier("");
    setVerified(undefined);

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of humanhood",
      mode: "compressed-evm",
      devMode: false,
    });

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

    console.log(address, functionName, abi);
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
    // .eq('birthdate', new Date('1994-11-24'))
      .done();

    setQueryUrl(url);
    console.log(url);

    setRequestInProgress(true);

    onRequestReceived(() => {
      console.log("QR code scanned");
      setMessage("Request received");
    });

    onGeneratingProof(() => {
      console.log("Generating proof");
      setMessage("Generating proof...");
    });

    let proof: ProofResult | undefined;

    onProofGenerated((result: ProofResult) => {
      console.log("Proof result", result);
      proof = result;
      setMessage(`Proofs received`);
      setRequestInProgress(false);
    });

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Result", result);
      console.log("Result", result?.birthdate?.disclose?.result);
      console.log("date", new Date('1994-11-24T00:00:00Z'))
      console.log("Unique identifier", uniqueIdentifier);
      console.log("Verified", verified);
      console.log("Query result errors", queryResultErrors);

      // Check if connected address is a Safe owner before proceeding
      if (!isConnectedAddressOwner()) {
        console.error("Access denied: Only Safe owners can register modules");
        setMessage("Error: Only Safe owners can register modules");
        setRequestInProgress(false);
        return;
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
      });


      const safeTransactionData: MetaTransactionData = {
        to: ZK_MODULE_ADDRESS,
        value: '0', // 1 wei
        data: encodeFunctionData({
          abi: ZK_MODULE_ABI,
          functionName: "register",
          // @ts-ignore
          args: [verifierParams, safeInfo!.address]
        }),
        operation: OperationType.Call
      }

      const transactionData = {
        to: ZK_MODULE_ADDRESS,
        value: '0',
        data: encodeFunctionData({
          abi: ZK_MODULE_ABI,
          functionName: "register",
          // @ts-ignore
          args: [verifierParams, safeInfo!.address]
        })
      }



      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]})
      const txHash = await protocolKit.signTransaction(transaction)
      console.log("Transaction hash", txHash)
      const executeTxResponse = await protocolKit.executeTransaction(transaction)
      console.log("Execute transaction response", executeTxResponse)
      console.log("Result of the query", result);
      console.log("Query result errors", queryResultErrors);
      setMessage("Result received");
      setUniqueIdentifier(uniqueIdentifier || "");
      setVerified(verified);
      setRequestInProgress(false);

    });

    onReject(() => {
      console.log("User rejected");
      setMessage("User rejected the request");
      setRequestInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Error", error);
      setMessage("An error occurred");
      setRequestInProgress(false);
    });
  };

  const handleRecovery = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    
    // Reset recovery state
    setRecoveryMessage("");
    setRecoveryQueryUrl("");
    setRecoveryUniqueIdentifier("");
    setRecoveryVerified(undefined);

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Safe Recovery - Verify your identity to recover access",
      mode: "compressed-evm",
      devMode: false,
    });

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

    console.log("Recovery verifier details:", address, functionName, abi);
    
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
      .done();

    setRecoveryQueryUrl(url);
    console.log("Recovery QR URL:", url);

    setRecoveryInProgress(true);

    onRequestReceived(() => {
      console.log("Recovery QR code scanned");
      setRecoveryMessage("Recovery request received");
    });

    onGeneratingProof(() => {
      console.log("Generating recovery proof");
      setRecoveryMessage("Generating recovery proof...");
    });

    let recoveryProof: ProofResult | undefined;

    onProofGenerated((result: ProofResult) => {
      console.log("Recovery proof result", result);
      recoveryProof = result;
      setRecoveryMessage("Recovery proof received");
      setRecoveryInProgress(false);
    });

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Recovery result", result);
      console.log("Recovery unique identifier", uniqueIdentifier);
      console.log("Recovery verified", verified);
      console.log("Recovery query result errors", queryResultErrors);

      // Get verification parameters for the recovery transaction
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: recoveryProof!,
        devMode: false,
      });

      // Convert parameters for wagmi compatibility
      const wagmiVerifierParams = {
        ...verifierParams,
        vkeyHash: verifierParams.vkeyHash as `0x${string}`,
        proof: verifierParams.proof as `0x${string}`,
        publicInputs: verifierParams.publicInputs as `0x${string}`[],
        committedInputs: verifierParams.committedInputs as `0x${string}`,
        committedInputCounts: verifierParams.committedInputCounts.map((count: number) => BigInt(count)),
        validityPeriodInDays: BigInt(verifierParams.validityPeriodInDays)
      };

      try {
        // Validate addresses
        if (!oldOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid current owner address format");
          setRecoveryInProgress(false);
          return;
        }

        if (!newOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid new owner address format");
          setRecoveryInProgress(false);
          return;
        }

        // Execute recovery transaction using wagmi with actual addresses
        await writeContract({
          address: ZK_MODULE_ADDRESS as `0x${string}`,
          abi: ZK_MODULE_ABI,
          functionName: 'Recover',
          // @ts-ignore - Type compatibility between ZKPassport SDK and wagmi
          args: [
            wagmiVerifierParams,
            ethereumAddress as `0x${string}`, // safeAddress
            oldOwnerAddress as `0x${string}`, // oldOwner (from input)
            newOwnerAddress as `0x${string}`, // newOwner (from input)
            WITNESS_ADDRESS as `0x${string}`, // previousOwner (needs Safe owner list knowledge)
          ],
        });

        console.log("Recovery transaction submitted successfully");
        setRecoveryMessage("Recovery transaction submitted - waiting for confirmation");
        
      } catch (err) {
        console.error("Recovery transaction failed:", err);
        setRecoveryMessage("Recovery transaction failed: " + (err instanceof Error ? err.message : 'Unknown error'));
        setRecoveryInProgress(false);
        return;
      }

      setRecoveryUniqueIdentifier(uniqueIdentifier || "");
      setRecoveryVerified(verified);
      setRecoveryInProgress(false);
    });

    onReject(() => {
      console.log("Recovery request rejected");
      setRecoveryMessage("Recovery request was rejected");
      setRecoveryInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Recovery error", error);
      setRecoveryMessage("An error occurred during recovery");
      setRecoveryInProgress(false);
    });
  };

  const handleEnableModule = async () => {
    if (!account.address || !safeInfo) {
      setEnableModuleMessage("Error: No wallet connected or Safe not loaded");
      return;
    }

    // Check if user is a Safe owner
    if (!isConnectedAddressOwner()) {
      setEnableModuleMessage("Error: Only Safe owners can enable modules");
      return;
    }

    setEnableModuleLoading(true);
    setEnableModuleMessage("");

    try {
      const provider = await account.connector?.getProvider();
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      });

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
      };

      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]});
      const txResponse = await protocolKit.signTransaction(transaction);
      console.log("Enable module transaction signed:", txResponse);
      
      const executeTxResponse = await protocolKit.executeTransaction(transaction);
      console.log("Enable module transaction executed:", executeTxResponse);

      setEnableModuleMessage("Module enabled successfully! Please refresh the Safe information.");
      
    } catch (err) {
      console.error("Error enabling module:", err);
      setEnableModuleMessage("Error enabling module: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setEnableModuleLoading(false);
    }
  };

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
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === 'connected' && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>
      <div>
        <h2>Load a Safe Address</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={ethereumAddress}
            onChange={(e) => setEthereumAddress(e.target.value)}
            placeholder="Enter Safe address (0x...)"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '300px'
            }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading || account.status !== 'connected'}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #007bff',
              backgroundColor: loading || account.status !== 'connected' ? '#ccc' : '#007bff',
              color: 'white',
              cursor: loading || account.status !== 'connected' ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {loadError && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Error: {loadError}
          </div>
        )}
      </div>

      {safeInfo && (
        <div>
          <h2>Loaded Safe Information</h2>
          <div>
            <p><strong>Address:</strong> {safeInfo.address}</p>
            <p><strong>Deployed:</strong> {safeInfo.isDeployed ? 'Yes' : 'No'}</p>
            <p><strong>Threshold:</strong> {safeInfo.threshold}/{safeInfo.owners.length}</p>
            
            {/* Owner Status Indicator */}
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '10px',
              border: '2px solid',
              borderColor: isConnectedAddressOwner() ? '#10b981' : '#ef4444',
              backgroundColor: isConnectedAddressOwner() ? '#ecfdf5' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isConnectedAddressOwner() ? '#10b981' : '#ef4444'
              }}></div>
              <span style={{
                fontWeight: 'bold',
                color: isConnectedAddressOwner() ? '#065f46' : '#991b1b'
              }}>
                Wallet Status: {isConnectedAddressOwner() ? 'SAFE OWNER' : 'NOT OWNER'}
              </span>
              {account.address && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                  ({account.address.slice(0, 6)}...{account.address.slice(-4)})
                </span>
              )}
            </div>

            <p><strong>Owners:</strong></p>
            <ul>
              {safeInfo.owners.map((owner, index) => (
                <li key={index} style={{
                  fontWeight: account.address && owner.toLowerCase() === account.address.toLowerCase() ? 'bold' : 'normal',
                  color: account.address && owner.toLowerCase() === account.address.toLowerCase() ? '#10b981' : 'inherit'
                }}>
                  {owner}
                  {account.address && owner.toLowerCase() === account.address.toLowerCase() && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#10b981' }}>
                      (You)
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p><strong>Activated Modules:</strong></p>
            
            {/* ZK Module Status Indicator */}
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '10px',
              border: '2px solid',
              borderColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444',
              backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#ecfdf5' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444'
              }}></div>
              <span style={{
                fontWeight: 'bold',
                color: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#065f46' : '#991b1b'
              }}>
                ZK Module: {safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            {/* Enable Module Button - Only show if module is disabled */}
            {!safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
              <div style={{ marginBottom: '15px' }}>
                {!isConnectedAddressOwner() && (
                  <div style={{
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #ef4444',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#991b1b'
                  }}>
                    ⚠️ Only Safe owners can enable modules
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleEnableModule}
                  disabled={enableModuleLoading || !isConnectedAddressOwner()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    backgroundColor: enableModuleLoading || !isConnectedAddressOwner() ? '#ccc' : '#3b82f6',
                    color: 'white',
                    cursor: enableModuleLoading || !isConnectedAddressOwner() ? 'not-allowed' : 'pointer',
                    opacity: enableModuleLoading || !isConnectedAddressOwner() ? 0.6 : 1,
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {enableModuleLoading ? 'Enabling Module...' : 'Enable ZK Module'}
                </button>

                {enableModuleMessage && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: enableModuleMessage.includes('Error') ? '#fef2f2' : '#f0f9ff',
                    border: `1px solid ${enableModuleMessage.includes('Error') ? '#ef4444' : '#3b82f6'}`,
                    color: enableModuleMessage.includes('Error') ? '#991b1b' : '#1e40af',
                    fontSize: '12px'
                  }}>
                    {enableModuleMessage}
                  </div>
                )}
              </div>
            )}

            {safeInfo.modules.length > 0 ? (
              <ul>
                {safeInfo.modules.map((module, index) => (
                  <li key={index} style={{
                    fontWeight: module === ZK_MODULE_ADDRESS ? 'bold' : 'normal',
                    color: module === ZK_MODULE_ADDRESS ? '#10b981' : 'inherit'
                  }}>
                    {module}
                    {module === ZK_MODULE_ADDRESS && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#10b981' }}>
                        (ZK Module)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <p>No modules activated</p>
              </div>
            )}
                            <div>
                  <h3>Register a guardian</h3>
                  <p>Verify your identity</p>
                  
                  {!isConnectedAddressOwner() && (
                    <div style={{
                      padding: '10px',
                      borderRadius: '6px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #ef4444',
                      marginBottom: '10px',
                      color: '#991b1b'
                    }}>
                      <strong>⚠️ Access Denied:</strong> Only Safe owners can register new modules.
                      <br />
                      <small>Connect with an owner wallet address to continue.</small>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={createRequest}
                    disabled={requestInProgress || !isConnectedAddressOwner()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: requestInProgress || !isConnectedAddressOwner() ? '#ccc' : '#007bff',
                      backgroundColor: requestInProgress || !isConnectedAddressOwner() ? '#ccc' : '#007bff',
                      color: 'white',
                      cursor: requestInProgress || !isConnectedAddressOwner() ? 'not-allowed' : 'pointer',
                      opacity: requestInProgress || !isConnectedAddressOwner() ? 0.6 : 1
                    }}
                  >
                    {requestInProgress ? 'Processing...' : 
                     !isConnectedAddressOwner() ? 'Owner Access Required' :
                     queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
                  </button>
                  {queryUrl && <QRCode className="mb-4" value={queryUrl} />}
                  {message && <p>{message}</p>}
                  {uniqueIdentifier && (
                    <p className="mt-2">
                      <b>Unique identifier:</b>
                    </p>
                  )}
                  {uniqueIdentifier && <p>{uniqueIdentifier}</p>}
                  {verified !== undefined && (
                    <p className="mt-2">
                      <b>Verified:</b> {verified ? "Yes" : "No"}
                    </p>
                  )}
                </div>

                {/* Recovery Section - Only show if Safe is registered for recovery */}
                {isSafeRegisteredForRecovery() && (
                  <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                    <h3>Safe Recovery</h3>
                    <p>This Safe is registered for recovery. You can recover access using ZK identity verification.</p>
                    
                    {/* Recovery Status Indicator */}
                    <div style={{
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      border: '2px solid #10b981',
                      backgroundColor: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                      }}></div>
                      <span style={{
                        fontWeight: 'bold',
                        color: '#065f46'
                      }}>
                        Recovery Available - Unique ID: {recovererUniqueId}
                      </span>
                    </div>

                    {readLoading && (
                      <div style={{ color: '#6b7280', marginBottom: '10px' }}>
                        Loading recovery status...
                      </div>
                    )}

                    {readError && (
                      <div style={{ color: '#ef4444', marginBottom: '10px' }}>
                        Error loading recovery status
                      </div>
                    )}

                    {/* Recovery Owner Change Inputs */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '5px', 
                          fontWeight: 'bold',
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
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: `1px solid ${oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            backgroundColor: oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#fef2f2' : 'white',
                            color: '#000000'
                          }}
                          disabled={recoveryInProgress || isPending}
                        />
                        {oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) && (
                          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                            Invalid address format. Must be 42 characters starting with 0x.
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '5px', 
                          fontWeight: 'bold',
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
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: `1px solid ${newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            backgroundColor: newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#fef2f2' : 'white',
                            color: '#000000'
                          }}
                          disabled={recoveryInProgress || isPending}
                        />
                        {newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) && (
                          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                            Invalid address format. Must be 42 characters starting with 0x.
                          </div>
                        )}
                      </div>
                    </div>



                    <button
                      type="button"
                      onClick={handleRecovery}
                      disabled={recoveryInProgress || isPending || readLoading || 
                               !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                               !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: '1px solid #10b981',
                        backgroundColor: recoveryInProgress || isPending || readLoading || 
                                        !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                                        !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ? '#ccc' : '#10b981',
                        color: 'white',
                        cursor: recoveryInProgress || isPending || readLoading || 
                               !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                               !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ? 'not-allowed' : 'pointer',
                        opacity: recoveryInProgress || isPending || readLoading || 
                                !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                                !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) ? 0.6 : 1
                      }}
                    >
                      {!oldOwnerAddress.trim() || !newOwnerAddress.trim() ? 'Enter Owner Addresses' :
                       (oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress)) || (newOwnerAddress && !isValidEthereumAddress(newOwnerAddress)) ? 'Invalid Address Format' :
                       isPending ? 'Confirming Recovery Transaction...' :
                       recoveryInProgress ? 'Processing Recovery...' : 
                       readLoading ? 'Loading...' : 
                       recoveryQueryUrl ? 'Generate New Recovery Request' : 'Start Recovery Process'}
                    </button>

                    {/* Recovery QR Code */}
                    {recoveryQueryUrl && (
                      <div style={{ marginTop: '15px' }}>
                        <p><strong>Scan with ZKPassport app to verify your identity for recovery:</strong></p>
                        <QRCode className="mb-4" value={recoveryQueryUrl} />
                      </div>
                    )}

                    {/* Recovery Status Messages */}
                    {recoveryMessage && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        borderRadius: '4px',
                        backgroundColor: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#fef2f2' : '#f0f9ff',
                        border: `1px solid ${recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#ef4444' : '#3b82f6'}`,
                        color: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#991b1b' : '#1e40af'
                      }}>
                        <p>{recoveryMessage}</p>
                      </div>
                    )}

                    {/* Recovery Results */}
                    {recoveryUniqueIdentifier && (
                      <div style={{ marginTop: '10px' }}>
                        <p><strong>Recovery Unique Identifier:</strong></p>
                        <p style={{ wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>
                          {recoveryUniqueIdentifier}
                        </p>
                      </div>
                    )}

                    {recoveryVerified !== undefined && (
                      <div style={{ marginTop: '10px' }}>
                        <p><strong>Recovery Verification Status:</strong> 
                          <span style={{ 
                            color: recoveryVerified ? '#10b981' : '#ef4444',
                            fontWeight: 'bold',
                            marginLeft: '5px'
                          }}>
                            {recoveryVerified ? "✅ Verified" : "❌ Failed"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
