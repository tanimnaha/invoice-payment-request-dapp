# Stellar SafePay — Decentralized Invoicing & Payment Portal

Stellar SafePay is an on-chain invoice and payment request system built on the Stellar network using Soroban smart contracts. It enables freelancers to issue tamper-proof payment requests directly on-chain, storing the invoice ID, amount (in XLM/Stroops), due date, and detailed description on the ledger. Clients/payers can connect their Freighter wallet, view their outstanding and past invoices, and settle payments atomically and directly on-chain using smart contract methods.

---

## Tech Stack

- **Smart Contract Engine**: Rust & Soroban SDK (`soroban-sdk = "21.0.0"`)
- **Web Frontend**: Next.js 14/15 App Router, TypeScript, Tailwind CSS v4
- **Wallet Connection**: Freighter Browser Wallet (`@stellar/freighter-api`)
- **Stellar JavaScript SDK**: `@stellar/stellar-sdk` (latest)
- **Runtime & Package Manager**: Bun (or Node.js)
- **Target Network**: Stellar Testnet Only

---

## Prerequisites

Before setting up the project, ensure you have the following installed on your machine:

1. **Rust & Wasm Toolchain**:
   - Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - Install Wasm target: `rustup target add wasm32-unknown-unknown`
2. **Stellar CLI**:
   - `cargo install --locked stellar-cli --features opt`
3. **Node.js or Bun**:
   - Bun installed: `https://bun.sh` or Node.js 18+
4. **Freighter Wallet Extension**:
   - Installed in your web browser: [Freighter Wallet](https://freighter.app)

---

## Project Structure

```
/contracts
  ├── Cargo.toml            # Soroban dependency definitions & compiler settings
  └── src
      └── lib.rs            # Core Soroban invoice smart contract code & unit tests
/frontend
  ├── app
  │   ├── layout.tsx        # Base page wrappers & Outfit/Inter Google Font loader
  │   ├── page.tsx          # Premium dark-mode glassmorphism landing layout
  │   └── globals.css       # Custom design system style & glow sheet
  ├── components
  │   ├── WalletConnect.tsx # Freighter link & Friendbot active testnet activation button
  │   └── MainFeature.tsx   # Creation form, list tabs, overdue checks, and payment triggers
  ├── lib
  │   ├── stellar.ts        # Client-side Freighter wallet interface and transaction submiter
  │   └── contract.ts       # Soroban RPC client, simulator, and parameter converters
  ├── package.json          # Node dependency manifest
  ├── tsconfig.json         # TS configurations
  └── .env.local            # Local environment parameters (copied from .env.example)
.env.example                # Template defining network passphrases and RPC endpoints
README.md                   # Complete step-by-step developer walkthrough (This file)
```

---

## Step 1 — Build the Smart Contract

1. Open your terminal and navigate to the contract directory:
   ```bash
   cd contracts
   ```
2. Build the optimized WebAssembly binary of your Soroban contract:
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```
3. **What this produces**:
   This produces a production-ready, highly-optimized `.wasm` file representing your contract compiled code. It is located at:
   `contracts/target/wasm32-unknown-unknown/release/invoice_contract.wasm`

---

## Step 2 — Set Up a Testnet Identity

1. Generate a new, secure global keypair associated with Stellar Testnet:
   ```bash
   stellar keys generate --global my-key --network testnet
   ```
2. Retrieve the public key (G... address) of your identity:
   ```bash
   stellar keys address my-key
   ```
   *Note: This command generates the keys and automatically requests Friendbot to fund the account with 10,000 free Testnet XLM so it is instantly active on-chain!*

---

## Step 3 — Deploy Contract to Testnet

1. Deploy the compiled WASM binary to Stellar Testnet using your generated identity:
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/invoice_contract.wasm \
     --source my-key \
     --network testnet
   ```
2. **What this produces**:
   This returns the **Contract ID** representing your deployed instance (looks like `CC5Y...`). Copy this Contract ID; you will need it in Step 5.

---

## Step 4 — Install Frontend Dependencies

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install all standard Node/Bun dependencies:
   ```bash
   bun install
   ```
   *(or `npm install` if not using Bun)*

---

## Step 5 — Configure Environment Variables

1. Copy the example configuration template to create your local environment:
   ```bash
   cp ../.env.example .env.local
   ```
2. Open the newly created `frontend/.env.local` file and paste the Contract ID you copied in **Step 3** into the `NEXT_PUBLIC_CONTRACT_ID` variable:
   ```env
   NEXT_PUBLIC_CONTRACT_ID=CC5Y...YOUR_CONTRACT_ID...
   NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
   NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
   NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
   ```

---

## Step 6 — Run the Frontend

1. Start your local hot-reloading Next.js development server:
   ```bash
   bun run dev
   ```
   *(or `npm run dev` if using npm)*
2. Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

---

## Step 7 — Using the App

### 1. Configure Freighter Wallet
- Click the Freighter wallet browser extension icon.
- Enter your password to unlock your wallet.
- Open **Settings (Gear Icon) -> Network** and switch it to **Testnet** (Crucial: never attempt to use Mainnet).

### 2. Connect to SafePay
- Open the app and click **Connect Freighter** in the header connection card.
- Approve the connection request pop-up in Freighter.
- Once connected, your truncated Stellar public key address will be displayed.

### 3. Activate/Fund Your Account
- If your Freighter account is new or unactivated, a yellow banner will detect this automatically. Click **Get Testnet XLM** (triggers Friendbot) to fetch 10,000 testnet XLM.
- If your account is already active, you can click **Request 10k XLM** at any time to receive additional testnet funding for transactions.

### 4. Create an Invoice (Freelancer View)
- Go to the **Create Invoice** tab.
- Enter a unique **Invoice ID** (e.g., `INV-2026-005`).
- Enter the client's **Payer Public Key** (Stellar `G...` address).
- Enter the **Amount (in XLM)** (e.g. `120.75`).
- Select a **Due Date & Time** in the future.
- Provide a detailed **Description** of your work scope.
- Click **Publish Invoice & Request Payment**. A Freighter prompt will ask you to sign the simulated contract call transaction. Approve it to write it to the ledger!

### 5. Review & Settle Invoices (Payer View)
- Switch your Freighter account to the payer's address (or share your Invoice ID with another connected wallet).
- Go to the **Assigned to Me** tab. You will see a list of outstanding invoices sent to you.
- Cards show an amber **Pending** badge if unpaid, or a red **Overdue** badge if unpaid and past the due date.
- Click **Pay Invoice** on an outstanding invoice. Sign the transaction in Freighter. The smart contract atomically transfers XLM from your wallet to the freelancer and updates the invoice status to **Paid** instantly!

---

## Smart Contract Functions

The following functions are exposed in the `InvoiceContract`:

### 1. `create_invoice` (Write Method)
- **Description**: Creates and publishes a new invoice request on-chain.
- **Parameters**:
  - `creator: Address`: The freelancer address (requires cryptographic authentication).
  - `id: String`: Unique invoice alphanumeric identifier.
  - `payer: Address`: The assigned client public key.
  - `amount: i128`: Payment amount in Stroops (1 XLM = 10,000,000 Stroops).
  - `due_date: u64`: UNIX timestamp (in seconds) by which payment is expected.
  - `description: String`: Brief summary description or scope.
- **Validations**: Throws `InvalidAmount` if amount <= 0, `InvalidDueDate` if date is in the past, or `InvoiceAlreadyExists` if ID is already registered.

### 2. `pay_invoice` (Write Method)
- **Description**: Atomic, secure settlement of an invoice in XLM.
- **Parameters**:
  - `payer: Address`: The payer address making the transaction (requires auth).
  - `id: String`: The unique invoice ID to pay.
  - `token_address: Address`: Contract address of the XLM token (Stellar Asset Contract).
- **Validations**: Throws `InvoiceNotFound` if ID is missing, `NotPayer` if caller is not the assigned payer, or `InvoiceAlreadyPaid` if status is already Paid.

### 3. `get_invoice` (Read Method)
- **Description**: Returns all on-chain metadata for a single invoice.
- **Parameters**:
  - `id: String`: Unique invoice ID.

### 4. `get_freelancer_invoices` (Read Method)
- **Description**: Lists all invoices created/issued by a specific freelancer.
- **Parameters**:
  - `freelancer: Address`: Public key of the freelancer.

### 5. `get_payer_invoices` (Read Method)
- **Description**: Lists all invoices issued to a specific payer.
- **Parameters**:
  - `payer: Address`: Public key of the payer.

---

## Common Errors & Fixes

1. **"Transaction simulation failed: NEXT_PUBLIC_CONTRACT_ID is not configured"**
   - **Fix**: You must deploy the contract to Testnet first (Step 3), then copy that address into `frontend/.env.local` (Step 5). Restart your dev server.
2. **"Freighter wallet extension not found"**
   - **Fix**: Install the official Freighter browser extension from [freighter.app](https://freighter.app) and refresh the page.
3. **"Transaction simulation failed: host error: HostError: Error(Value, ...)"**
   - **Fix**: This usually means input validation failed on-chain. Check that:
     - The Invoice ID is unique (doesn't exist on-chain).
     - The Amount is strictly positive.
     - The Due Date is in the future.
4. **"Transaction signing canceled or failed"**
   - **Fix**: You rejected the signature prompt in Freighter, or your Freighter wallet is locked. Unlock Freighter and click the transaction button again.
5. **Windows Native `cargo test` Incompatibility**
   - **Error**: `error: dlltool could not create import library with C:\MinGW\bin\dlltool.exe ... Invalid bfd target`
   - **Fix**: This is a known local Windows compiler environment issue when compiling host backtrace libraries. It **does not affect compilation to WASM**. Simply run:
     `cargo build --target wasm32-unknown-unknown --release`
     This bypasses the Windows host toolchain and builds the target smart contract WASM perfectly!

---

## Testnet Resources

- **Stellar Testnet Explorer**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
- **Stellar Lab Sandbox (Simulate & Submit)**: [lab.stellar.org](https://lab.stellar.org)
- **Soroban Testnet RPC URL**: `https://soroban-testnet.stellar.org`
- **Horizon Testnet URL**: `https://horizon-testnet.stellar.org`
- **Friendbot Endpoint**: `https://friendbot.stellar.org/?addr=YOUR_ADDRESS`
