'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import ZKPassportSection from '../components/ZKPassportSection'
import ConnectionCard from '../components/ConnectionCard'
import SafeLoadingCard from '../components/SafeLoadingCard'
import SafeInfoCard from '../components/SafeInfoCard'
import { isSafeConnector } from '../utils/safeHelpers'
import { ZK_MODULE_ADDRESS } from '../utils/constants'
import { useSafeInfo } from '../hooks/useSafeInfo'
import { useRecovererInfo } from '../hooks/useRecovererInfo'
import { useSafeValidation } from '../hooks/useSafeValidation'
import styles from './page.module.css'

function App() {
  const account = useAccount()

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
            <ConnectionCard 
              account={account} 
              isOnSepolia={isOnSepolia} 
            />
            <SafeLoadingCard
              account={account}
              isOnSepolia={isOnSepolia}
              ethereumAddress={ethereumAddress}
              setEthereumAddress={setEthereumAddress}
              loading={loading}
              loadError={loadError}
            />
          </div>

          {/* Right Column - Safe Information */}
          {account.status === 'connected' && safeInfo && (
            <div>
              <SafeInfoCard
                account={account}
                safeInfo={safeInfo}
                isOwner={isOwner}
              />
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

          </>
        )}
      </div>
    </div>
  )
}

export default App