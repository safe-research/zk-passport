import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, safe } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [sepolia],
    connectors: [
      injected(),
      safe({
        allowedDomains: [
          /^app\.safe\.global$/,
        ],
        debug: true, // Enable debug mode for development
      })
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [sepolia.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
