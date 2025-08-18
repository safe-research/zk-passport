import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, safe } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    safe()
  ],
  transports: {
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
