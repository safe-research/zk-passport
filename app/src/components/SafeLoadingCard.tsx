'use client'

import { isSafeConnector } from '../utils/safeHelpers'
import styles from '../app/page.module.css'

interface SafeLoadingCardProps {
  account: any
  isOnSepolia: boolean
  ethereumAddress: string
  setEthereumAddress: (address: string) => void
  loading: boolean
  loadError: any
}

function SafeLoadingCard({ 
  account, 
  isOnSepolia, 
  ethereumAddress, 
  setEthereumAddress, 
  loading, 
  loadError 
}: SafeLoadingCardProps) {
  if (account.status !== 'connected') {
    return null
  }

  return (
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
  )
}

export default SafeLoadingCard
