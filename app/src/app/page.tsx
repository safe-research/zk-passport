'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain } from 'wagmi'
import Safe, { Eip1193Provider } from '@safe-global/protocol-kit'
import ZKPassportSection from '../components/ZKPassportSection'
import {
  isConnectedAddressOwner,
  isSafeRegisteredForRecovery,
  isConnectedToSepolia,
  getSepoliaChain,
  switchToSepolia
} from '../utils/safeHelpers'
import { ZK_MODULE_ADDRESS, ZK_MODULE_ABI } from '../utils/constants'
import styles from './page.module.css'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitchingChain } = useSwitchChain()

  const [ethereumAddress, setEthereumAddress] = useState('0x7af06A5E7226075DF00402A556f5529cf6D836CC')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

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

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Prevent hydration errors
  if (!mounted) {
    return null
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Safe Recovery Module</h1>
          <p className={styles.headerDescription}>
            Secure Safe wallet recovery using ZKPassport identity verification
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className={`${styles.gridLayout} ${account.status === 'connected' && safeInfo ? styles.gridDouble : styles.gridSingle}`}>
          {/* Left Column - Connection & Safe Loading */}
          <div>
            {/* Connection Card */}
            <div className={styles.card}>
              <h2 className={`${styles.cardTitle} ${styles.cardTitleWithStatus}`}>
                <div className={account.status === 'connected' ? styles.statusDotGreen : styles.statusDotRed}></div>
                Wallet Connection
              </h2>

              {account.status === 'connected' ? (
                <div>
                  <div className={`${styles.connectionStatus} ${styles.connectionStatusConnected}`}>
                    <p className={styles.connectionStatusText}>
                      ✅ Connected to {account.addresses?.[0]?.slice(0, 6)}...{account.addresses?.[0]?.slice(-4)}
                    </p>
                    <p className={styles.connectionStatusChain}>
                      Chain ID: {account.chainId}
                    </p>
                  </div>

                  {/* Chain Warning - Show when not connected to Sepolia */}
                  {!isConnectedToSepolia(account) && (
                    <div className={styles.networkWarning}>
                      <div className={styles.networkWarningHeader}>
                        <div className={styles.statusDotRed}></div>
                        <p className={styles.networkWarningTitle}>⚠️ Wrong Network</p>
                      </div>
                      <p className={styles.networkWarningText}>
                        Please switch to Sepolia Testnet (Chain ID: 11155111) to use this application.
                      </p>
                      {getSepoliaChain(chains) && (
                        <button
                          type="button"
                          onClick={() => switchToSepolia(chains, switchChain)}
                          disabled={isSwitchingChain}
                          className={`${styles.button} ${styles.buttonDanger} ${isSwitchingChain ? styles.buttonDisabled : ''}`}
                        >
                          {isSwitchingChain ? (
                            <span className={styles.buttonLoading}>
                              <div className={styles.spinner}></div>
                              Switching...
                            </span>
                          ) : (
                            <>🔄 Switch to {getSepoliaChain(chains)?.name}</>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => disconnect()}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <p className={styles.cardDescription}>
                    Connect your wallet to get started
                  </p>
                  <div className={styles.flexColumn}>
                    {connectors.map((connector) => (
                      <button
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                        type="button"
                        className={`${styles.button} ${styles.buttonPrimary}`}
                      >
                        Connect {connector.name}
                      </button>
                    ))}
                  </div>
                  {status && (
                    <p className={`${styles.cardDescription} ${styles.mt4}`}>{status}</p>
                  )}
                  {error?.message && (
                    <p className={`${styles.errorMessage} ${styles.mt4}`}>{error.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Safe Loading Card */}
            {account.status === 'connected' && (
              <div className={`${styles.card} ${styles.cardLast}`}>
                <h2 className={styles.cardTitle}>Load Safe Wallet</h2>
                <p className={styles.cardDescription}>
                  Enter your Safe wallet address to manage recovery settings
                </p>

                {/* Network warning for Safe loading */}
                {!isConnectedToSepolia(account) && (
                  <div className={styles.networkWarning}>
                    <p className={styles.networkWarningText}>
                      ⚠️ Safe loading is disabled. Please switch to Sepolia Testnet to continue.
                    </p>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    value={ethereumAddress}
                    onChange={(e) => setEthereumAddress(e.target.value)}
                    placeholder="Enter Safe address (0x...)"
                    className={styles.input}
                    disabled={loading || !isConnectedToSepolia(account)}
                  />
                  <button
                    type="button"
                    onClick={handleLoad}
                    disabled={loading || !isConnectedToSepolia(account)}
                    className={`${styles.loadButton} ${loading || !isConnectedToSepolia(account) ? styles.buttonDisabled : styles.buttonPrimary}`}
                  >
                    {!isConnectedToSepolia(account) ? 'Wrong Network' : loading ? 'Loading...' : 'Load Safe'}
                  </button>
                </div>

                {loadError && (
                  <div className={styles.errorMessage}>
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
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Safe Information</h2>

                {/* Safe Details */}
                <div className={styles.safeDetails}>
                  <div className={styles.safeDetailItem}>
                    <span className={styles.safeDetailLabel}>Address:</span>
                    <p className={styles.safeDetailValue}>{safeInfo.address}</p>
                  </div>
                  <div className={styles.safeDetailItem}>
                    <span className={styles.safeDetailLabel}>Status:</span>
                    <p className={styles.safeDetailValue}>
                      {safeInfo.isDeployed ? '✅ Deployed' : '❌ Not Deployed'} •
                      Threshold: {safeInfo.threshold}/{safeInfo.owners.length}
                    </p>
                  </div>
                </div>

                {/* Wallet Status */}
                <div className={`${styles.ownerStatus} ${isConnectedAddressOwner(account, safeInfo) ? styles.ownerStatusOwner : styles.ownerStatusNotOwner}`}>
                  <div className={isConnectedAddressOwner(account, safeInfo) ? styles.statusDotGreen : styles.statusDotRed}></div>
                  <span className={`${styles.ownerStatusText} ${isConnectedAddressOwner(account, safeInfo) ? styles.ownerStatusTextOwner : styles.ownerStatusTextNotOwner}`}>
                    {isConnectedAddressOwner(account, safeInfo) ? 'SAFE OWNER' : 'NOT OWNER'}
                  </span>
                </div>

                {/* Owners List */}
                <div className={styles.ownersSection}>
                  <h3 className={styles.ownersTitle}>Owners ({safeInfo.owners.length})</h3>
                  <div className={styles.ownersList}>
                    {safeInfo.owners.map((owner, index) => (
                      <div
                        key={index}
                        className={`${styles.ownerItem} ${
                          account.address && owner.toLowerCase() === account.address.toLowerCase() 
                            ? styles.ownerItemCurrent 
                            : styles.ownerItemDefault
                        }`}
                      >
                        <span className={styles.ownerIndex}>{index + 1}.</span>
                        <span className={styles.ownerAddress}>{owner}</span>
                        {account.address && owner.toLowerCase() === account.address.toLowerCase() && (
                          <span className={styles.ownerYouBadge}>YOU</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZK Module Status */}
                <div className={`${styles.moduleStatus} ${safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? styles.moduleStatusEnabled : styles.moduleStatusDisabled}`}>
                  <div className={safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? styles.statusDotGreen : styles.statusDotRed}></div>
                  <span className={`${styles.moduleStatusText} ${safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? styles.moduleStatusTextEnabled : styles.moduleStatusTextDisabled}`}>
                    ZK Recovery Module: {safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? 'ENABLED' : 'DISABLED'}
                  </span>
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
  )
}

export default App