'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import Safe, {
  Eip1193Provider
} from '@safe-global/protocol-kit'
import QRCode from "react-qr-code";

// verifier address: 0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE
// module address: 0x4b4aE00f451bf9a61605dDa6d0203ae2b4473D2d

const ZK_MODULE_ADDRESS = '0x4b4aE00f451bf9a61605dDa6d0203ae2b4473D2d'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [ethereumAddress, setEthereumAddress] = useState('0x7af06A5E7226075DF00402A556f5529cf6D836CC')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState("");
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const zkPassportRef = useRef<ZKPassport | null>(null);

  const [safeInfo, setSafeInfo] = useState<{
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null>(null)

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport();
    }
  }, []);

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    setMessage("");
    setQueryUrl("");
    setUniqueIdentifier("");
    setVerified(undefined);

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of EU citizenship and firstname",
      scope: "eu-adult",
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

    const proofs: ProofResult[] = [];

    onProofGenerated((result: ProofResult) => {
      console.log("Proof result", result);
      proofs.push(result);
      setMessage(`Proofs received`);
      setRequestInProgress(false);
    });

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      const provider = await account.connector?.getProvider()
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      })

      const safeTransactionData: MetaTransactionData = {
        to: ZK_MODULE_ADDRESS,
        value: 0,
        data: abi.encodeFunctionData(functionName, [result]),
        operation: 0,
      }

      const transaction = await protocolKit.createTransaction(safeTransactionData)
      const txHash = await protocolKit.signTransaction(transaction)
      console.log("Transaction hash", txHash)
      const executeTxResponse = await protocolKit.executeTransaction(transaction)
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
            <p><strong>Owners:</strong></p>
            <ul>
              {safeInfo.owners.map((owner, index) => (
                <li key={index}>
                  {owner}
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
                  <h3>Register New Module with ZKPassport</h3>
                  <p>Verify your identity to register a new Safe module</p>
                  <button
                    type="button"
                    onClick={createRequest}
                    disabled={requestInProgress}
                  >
                    {queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
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
          </div>
        </div>
      )}
    </>
  )
}

export default App
