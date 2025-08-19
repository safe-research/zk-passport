'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import ZKPassportSection from '../components/ZKPassportSection'
import CandideZKPassportSection from '../components/CandideZKPassportSection'
import {
  getSepoliaChain,
  switchToSepolia,
  isSafeConnector
} from '../utils/safeHelpers'
import { ZK_MODULE_ADDRESS } from '../utils/constants'
import { useSafeInfo } from '../hooks/useSafeInfo'
import { useRecovererInfo } from '../hooks/useRecovererInfo'
import { useSafeValidation } from '../hooks/useSafeValidation'
import styles from './page.module.css'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitchingChain } = useSwitchChain()

  const [ethereumAddress, setEthereumAddress] = useState('')
  const [mounted, setMounted] = useState(false)
  const [recoveryType, setRecoveryType] = useState<'zkpassport' | 'candide'>('zkpassport')
  const [isAutoLoaded, setIsAutoLoaded] = useState(false)
  const [moduleAddress, setModuleAddress] = useState(ZK_MODULE_ADDRESS)

  // Use the Safe info hook
  const { 
    data: safeInfo, 
    isLoading: loading, 
    error: loadError, 
    refetch: refetchSafeInfo 
  } = useSafeInfo({ 
    safeAddress: ethereumAddress,
    enabled: !!ethereumAddress && account.chainId === 11155111 // Sepolia chain ID
  })

  // Read the safeToRecoverer mapping to check if Safe is registered for recovery
  const { 
    data: recovererUniqueId, 
    isError: readError, 
    isLoading: readLoading, 
    refetch: refetchRecoverer 
  } = useRecovererInfo({
    moduleAddress,
    safeAddress: ethereumAddress,
    enabled: !!ethereumAddress
  })

  // Use validation hook for computed states
  const {
    isOwner,
    isRegisteredForRecovery,
    isOnSepolia,
    isConnectedAddressOwner,
    isSafeRegisteredForRecovery,
    isConnectedToSepolia
  } = useSafeValidation({
    account,
    safeInfo: safeInfo || null,
    recovererUniqueId,
    readError,
    readLoading
  })

  // Log when recoverer data changes
  useEffect(() => {
    if (recovererUniqueId !== undefined) {
      console.log('🔄 useRecovererInfo: Recoverer data refreshed for Safe:', ethereumAddress, 'Data:', recovererUniqueId)
    }
  }, [recovererUniqueId, ethereumAddress])

  // Log when recoverer data has errors
  useEffect(() => {
    if (readError) {
      console.log('❌ useRecovererInfo: Error refreshing recoverer data for Safe:', ethereumAddress)
    }
  }, [readError, ethereumAddress])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset state when account changes
  useEffect(() => {
    if (account.status !== 'connected') {
      setEthereumAddress('')
      setIsAutoLoaded(false)
    }
  }, [account.status, account.address])

  // Auto-load Safe information when connected via Safe connector
  useEffect(() => {
    if (account.status === 'connected' && 
        account.address && 
        isSafeConnector(account) && 
        isOnSepolia && 
        !ethereumAddress) {
      setEthereumAddress(account.address)
      setIsAutoLoaded(true)
    }
  }, [account.status, account.address, account.connector?.id, account.chainId, ethereumAddress])


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

        {/* Recovery Type Selection - Full Width */}
        {account.status === 'connected' && safeInfo && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Choose Recovery Type</h2>
            <p className={styles.cardDescription}>Select which recovery flow you want to use</p>
            <div className={styles.flexColumn}>
              <button
                type="button"
                onClick={() => setRecoveryType('candide')}
                className={`${styles.button} ${styles.buttonFullWidth} ${recoveryType === 'candide' ? styles.buttonPrimary : ''}`}
              >
                Candide ZKPassport
              </button>
              <button
                type="button"
                onClick={() => setRecoveryType('zkpassport')}
                className={`${styles.button} ${styles.buttonFullWidth} ${recoveryType === 'zkpassport' ? styles.buttonPrimary : ''}`}
              >
                ZKPassport
              </button>
            </div>
          </div>
        )}

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
                  {!isOnSepolia && (
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
                  {error?.message && (
                    <p className={`${styles.errorMessage} ${styles.mt4}`}>{error.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Safe Loading Card */}
            {account.status === 'connected' && (
              <div className={`${styles.card} ${styles.cardLast}`}>
                <h2 className={styles.cardTitle}>
                  {isSafeConnector(account) ? 'Safe Wallet Detected' : 'Load Safe Wallet'}
                </h2>
                <p className={styles.cardDescription}>
                  {isSafeConnector(account) 
                    ? 'Connected via Safe connector'
                    : 'Enter your Safe wallet address to manage recovery settings'
                  }
                </p>

                {/* Network warning for Safe loading */}
                {!isOnSepolia && (
                  <div className={styles.networkWarning}>
                    <p className={styles.networkWarningText}>
                      ⚠️ Safe loading is disabled. Please switch to Sepolia Testnet to continue.
                    </p>
                  </div>
                )}

                {isSafeConnector(account) ? (
                  <div className={styles.autoLoadInfo}>
                    <div className={`${styles.connectionStatus} ${styles.connectionStatusConnected}`}>
                      <p className={styles.connectionStatusText}>
                        🔐 Safe Address: {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                      </p>
                      {loading && (
                        <p className={styles.connectionStatusChain}>
                          🔄 Loading Safe information...
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      value={ethereumAddress}
                      onChange={(e) => setEthereumAddress(e.target.value)}
                      placeholder="Enter Safe address (0x...)"
                      className={styles.input}
                      disabled={loading || !isOnSepolia}
                    />
                  </div>
                )}

                {loadError && (
                  <div className={styles.errorMessage}>
                    <strong>Error:</strong> {loadError instanceof Error ? loadError.message : 'Failed to load Safe'}
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
                <div className={`${styles.ownerStatus} ${isOwner ? styles.ownerStatusOwner : styles.ownerStatusNotOwner}`}>
                  <div className={isOwner ? styles.statusDotGreen : styles.statusDotRed}></div>
                  <span className={`${styles.ownerStatusText} ${isOwner ? styles.ownerStatusTextOwner : styles.ownerStatusTextNotOwner}`}>
                    {isOwner ? 'SAFE OWNER' : 'NOT OWNER'}
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
              </div>

            </div>
          )}
        </div>
        {/* Recovery Sections - Full Width */}
        {account.status === 'connected' && safeInfo && (
          <>
            {recoveryType === 'zkpassport' && (
              <ZKPassportSection
                account={account}
                safeInfo={safeInfo}
                safeAddress={ethereumAddress}
                recovererUniqueId={recovererUniqueId}
                readError={readError}
                readLoading={readLoading}
                refetchRecoverer={() => { 
                  console.log('🔄 Manual refetch: Triggering recoverer data refresh for Safe:', ethereumAddress)
                  try { refetchRecoverer?.() } catch (_) {} 
                }}
                isConnectedAddressOwner={isConnectedAddressOwner}
                isSafeRegisteredForRecovery={isSafeRegisteredForRecovery}
                isConnectedToSepolia={isConnectedToSepolia}
                handleLoad={() => {
                  console.log('🔄 Manual refetch: Triggering Safe info refresh for address:', ethereumAddress)
                  refetchSafeInfo()
                }}
                onModuleAddressChange={setModuleAddress}
              />
            )}

            {recoveryType === 'candide' && (
              <CandideZKPassportSection />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App