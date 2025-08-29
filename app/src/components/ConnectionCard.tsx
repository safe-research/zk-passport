'use client'

import { useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { getSepoliaChain, switchToSepolia } from '../utils/safeHelpers'
import styles from '../app/page.module.css'

interface ConnectionCardProps {
  account: any
  isOnSepolia: boolean
}

function ConnectionCard({ account, isOnSepolia }: ConnectionCardProps) {
  const { connectors, connect, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitchingChain } = useSwitchChain()

  return (
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
  )
}

export default ConnectionCard
