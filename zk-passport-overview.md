# ZK Passport — Where Are We Now?

Zero-knowledge proofs have improved privacy by letting users prove facts about themselves without exposing raw data. ZK Passport technology applies this idea to the most widely trusted documents on earth: biometric passports and government IDs. The result is a reusable, privacy-preserving credential that can be verified on-chain or off-chain by decentralized applications.

This article analyzes how ZK Passport systems operate today and the trade‑offs they entail. It also documents a hands‑on demonstration using ZK Passport (via the ZKPassport app) to show the flow end‑to‑end. References include the ZKPassport documentation and background on biometric passports and registry design [ZKPassport Intro](https://docs.zkpassport.id/intro), [ZK Passport docs](https://docs.rarimo.com/zk-passport/), and [Biometric passports 101](https://docs.rarimo.com/zk-passport/biometric-passports-101/).
## Why Passports Fit ZK

Passports are globally standardized under ICAO’s Machine Readable Travel Documents framework. Each biometric passport embeds an NFC chip that stores the Machine‑Readable Zone (MRZ): identity fields, the expiration date, and the issuing authority’s digital signature. A verifier can read the chip and validate the signature, ensuring the data has not been forged. ZK Passport projects build on that strong public‑key infrastructure to prove statements like “over 18” or “citizen of X” without revealing the full document [Biometric passports 101](https://docs.rarimo.com/zk-passport/biometric-passports-101/).

## How ZK Passport Works

At a high level, the user performs a one‑time setup in the mobile app, then produces lightweight proofs on demand:

First, during onboarding, the ZKPassport app scans the NFC chip, reads the MRZ, and generates a zero‑knowledge proof that the passport (or ID) is valid. Implementations typically register a hashed commitment in a shared on‑chain Merkle tree or registry. Because many users and dApps share this tree, it creates a “privacy network effect”: as the tree grows, it becomes harder to correlate any single hash to a specific real‑world person [ZKPassport Intro](https://docs.zkpassport.id/intro), [ZK Passport docs](https://docs.rarimo.com/zk-passport/).

Later, when a dApp requests verification, the app constructs a new proof of inclusion in the Merkle tree (and optionally other predicates like age or nationality) and returns it for verification on‑chain or off‑chain. This avoids re‑examining the entire passport each time, keeping subsequent proofs fast and cheap [ZK Passport docs](https://docs.rarimo.com/zk-passport/).

### Verification Modes

Many implementations balance device limits with privacy by combining on‑device proof generation with efficient verification. Some systems describe two modes: a full mode that proves both issuer‑signature validity and MRZ hash integrity on‑device, and a light mode that proves hash integrity locally while delegating signature checking to a trusted verifier due to smartphone constraints [ZK Passport docs](https://docs.rarimo.com/zk-passport/). ZKPassport focuses on local proof generation and provides verifier details for on‑chain checks where needed [ZKPassport Intro](https://docs.zkpassport.id/intro).

## Demonstration: ZKPassport End‑to‑End

The demonstration uses the ZKPassport app and SDK to gate Safe recovery in a decentralized application.

The process begins with a one‑time setup on a smartphone: the ZKPassport app is installed, the passport is tapped to the NFC reader, and the MRZ fields are read. The app produces an initial zero‑knowledge proof and registers the document’s commitment in a shared registry. Thereafter, proof requests can be satisfied without rescanning the document [ZKPassport Intro](https://docs.zkpassport.id/intro).

On the application side, the SDK generates a QR code (query URL). Scanning it in the ZKPassport app prompts the user to approve generation of a fresh proof of inclusion and the requested predicate (e.g., “proof of personhood” or “over 18”). The SDK exposes on‑chain verifier details for EVM networks (for example, a verifier contract on Ethereum Sepolia), which are used to verify proofs on‑chain. After verification, the recovery module’s `register` function is invoked to bind the proof to a Safe, and later the `recover` function rotates ownership to a new address upon successful verification. On modern phones, the round trip consistently completes in under a minute.

## Architecture Notes: DG1 Commitment and Selective Disclosure

In the referenced architecture, the passport is verified on‑chain (via ZK) once and a commitment to DG1 data is stored — a hash derived from fields such as full name and date of birth. Subsequent queries operate against that commitment and reveal only what is needed. For example, a circuit can prove “age ≥ 18” without exposing the actual birthday, or prove “is citizen of country X” without disclosing the entire MRZ.

This approach has important advantages. There is no single universal circuit that covers every passport format; instead, a set of heavier, one‑time verification circuits per format is maintained to normalize data into the same DG1 commitment. After that, lightweight query circuits can be reused across all participants. Commitments such as hash(full‑name + date‑of‑birth + user‑defined secret) are also feasible to bind a user‑chosen factor without leaking raw identity. Note that some attributes — for instance, place of birth — are not recorded in DG1 and would require a different data group.

## Personhood vs Identity (and the Doxxing Risk)

ZK Passports provide strong proof‑of‑personhood. But a naïve “proof of identity” that reveals or deterministically links full name, date of birth, or document number will effectively dox the user. The way to avoid this is to design custom query circuits that only disclose the minimum necessary predicate and never release the underlying DG1 values. The same caution applies to other projects in the space; without selective disclosure, identity proofs quickly become privacy disclosures.

## Ecosystem Snapshot

The ecosystem spans several implementations with distinct emphases but shared cryptographic primitives. A generic “ZK‑passport” approach shows that personhood can be established today, but identity proofs must be carefully designed to avoid leakage. The deployment described leverages a global Merkle registry and the DG1 commitment pattern for fine‑grained queries. Across the ecosystem, the rule of thumb holds: identity proofs that reveal raw fields dox users; predicate proofs avoid that risk.

### ZKPassport

ZKPassport provides a mobile application and SDK that perform document scanning, local proof generation, and verifier integration for EVM chains. The SDK exposes QR‑based request flows and on‑chain verifier details, making it straightforward to bind predicate proofs to smart‑contract logic (e.g., Safe recovery). Documentation emphasizes selective disclosure and on‑device generation with contract‑level verification where needed [ZKPassport Intro](https://docs.zkpassport.id/intro).

Advantages include developer‑centric integration paths (QR flows, verifier ABI exposure) and a compact on‑chain verification model. Limitations align with the broader space: device constraints for heavy proofs, absence of liveness by default, and the need for carefully designed query circuits to avoid identity leakage.

### Rarimo (ZK Passport)

Rarimo’s ZK Passport describes a global on‑chain Merkle registry and two verification modes: full (issuer signature and hash integrity proven on‑device) and light (hash integrity on‑device, issuer signature verified by a trusted service). The approach explicitly leverages a “privacy network effect” as the registry grows and documents a transition of circuits to Noir for better portability and security [ZK Passport docs](https://docs.rarimo.com/zk-passport/).

Advantages include a shared registry that amortizes costs over time and broad compatibility via light verification. Limitations include mobile hardware constraints for full verification, no built‑in liveness, inability to prevent multi‑passport onboarding, and the practical need to curate circuits across document formats.

### Self Protocol

Self is a privacy‑first identity protocol oriented toward Sybil resistance and selective disclosure using passport attestations. Its developer materials emphasize simple integration (builder tools, contract recipes) and common use cases such as airdrop protection, social proofs of humanity, quadratic funding defenses, and wallet recovery [Self Protocol docs](https://docs.self.xyz/).

Advantages include a streamlined builder experience, explicit support for predicate disclosures, and guidance for on‑chain integrations. Limitations include sparse public detail about underlying on‑chain registry structures and liveness; as with all implementations, naïve identity disclosures would compromise privacy if raw attributes are revealed.

### Privado ID (formerly Polygon ID)

Privado ID provides a full verifiable‑credentials (VC) stack built on the iden3 protocol, including issuer, verifier, and wallet components. It supports both off‑chain and on‑chain verification, state publication via Merkle tree proofs, revocation trees, and nullifier techniques to provide Sybil resistance and non‑reusable proofs. The ecosystem includes SDKs, smart contracts, and reference wallets, enabling end‑to‑end workflows from issuance to verification [Privado ID docs](https://docs.privado.id/).

Advantages include a mature VC model with revocation, rich developer tooling, and explicit Sybil‑resistance primitives (nullifiers). Limitations include the operational overhead of running issuers and managing credential lifecycles, and higher integration complexity relative to lighter “scan‑and‑prove” stacks.

## Limitations and What’s Next

There are well‑documented constraints. Full on‑device verification is still limited by mobile hardware in some cases. There are no built‑in biometric liveness checks, meaning a thief with a valid document could potentially generate proofs; ZK‑ML‑based liveness is an active area of research. The system cannot prevent a single person with multiple passports from onboarding multiple times. And for recovery, only documents with Active Authentication are widely supported today. Documentation also discusses using a shared Merkle tree to mitigate dictionary‑style correlation attacks by growing the anonymity set [ZKPassport Intro](https://docs.zkpassport.id/intro), [ZK Passport docs](https://docs.rarimo.com/zk-passport/).

## Bottom Line

ZK Passport systems already power production‑grade demonstrations and integrations. Evidence suggests that privacy‑preserving personhood is feasible, that selective disclosure is attainable with appropriately designed circuits, and that on‑chain verification can be achieved with acceptable user experience. Nevertheless, the most reliable mitigation against account loss or compromise remains sound key management.

In summary: ZK Passport can work, but it is not better than maintaining an EOA in a secure location.

## References

- ZKPassport documentation — Intro: [https://docs.zkpassport.id/intro](https://docs.zkpassport.id/intro)
- Self Protocol documentation: [https://docs.self.xyz/](https://docs.self.xyz/)
- Privado ID documentation: [https://docs.privado.id/](https://docs.privado.id/)
- Rarimo documentation — ZK Passport overview: [https://docs.rarimo.com/zk-passport/](https://docs.rarimo.com/zk-passport/)
- Rarimo documentation — Biometric passports 101: [https://docs.rarimo.com/zk-passport/biometric-passports-101/](https://docs.rarimo.com/zk-passport/biometric-passports-101/)