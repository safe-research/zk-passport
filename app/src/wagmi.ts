import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { safe, injected } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [sepolia],
    connectors: [
      injected(),
      safe(),
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
