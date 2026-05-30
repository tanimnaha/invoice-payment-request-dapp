import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const RPC_URL = 'https://soroban-testnet.stellar.org';

export function getNetworkConfig() {
  return {
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
  };
}

/**
 * Checks if Freighter is installed.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    return await isConnected();
  } catch (error) {
    console.error('Error checking Freighter installation:', error);
    return false;
  }
}

/**
 * Connects Freighter and returns the active public key.
 */
export async function getFreighterPublicKey(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error('Freighter wallet extension not found. Please install Freighter from https://freighter.app');
  }

  try {
    const publicKey = await getPublicKey();
    if (!publicKey) {
      throw new Error('Could not retrieve public key. Please unlock your Freighter wallet and try again.');
    }
    return publicKey;
  } catch (error: any) {
    throw new Error(error.message || 'User rejected the wallet connection request.');
  }
}

/**
 * Hits the Stellar Friendbot to fund a new Testnet account with 10,000 XLM.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  if (!publicKey) {
    throw new Error('Public key is required to fund an account.');
  }

  const friendbotUrl = `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`;
  
  try {
    const response = await fetch(friendbotUrl);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Friendbot error: ${errText || response.statusText}`);
    }
    
    // Give ledger some time to ingest and confirm the funding
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error: any) {
    throw new Error(`Failed to fund wallet via Friendbot: ${error.message || error}`);
  }
}

/**
 * Helper to check if an account exists on Testnet Horizon.
 * If not, we can recommend funding it.
 */
export async function checkAccountExists(publicKey: string): Promise<boolean> {
  const horizonServer = new Horizon.Server(HORIZON_URL);
  try {
    await horizonServer.loadAccount(publicKey);
    return true;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return false;
    }
    // For other connection errors, assume true or rethrow, but here we return false as safe fallback
    return false;
  }
}

/**
 * Signs a transaction XDR string using Freighter and submits it to the Testnet Horizon.
 */
export async function signAndSubmitTransaction(xdr: string): Promise<any> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error('Freighter wallet extension not found. Please install Freighter.');
  }

  let signedXdr: string;
  try {
    // Request signing from Freighter
    signedXdr = await signTransaction(xdr, {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    });
  } catch (error: any) {
    throw new Error(`Transaction signing canceled or failed: ${error.message || error}`);
  }

  // Submit to the Horizon network
  const horizonServer = new Horizon.Server(HORIZON_URL);
  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await horizonServer.submitTransaction(tx);
    return result;
  } catch (error: any) {
    console.error('Horizon transaction submission error:', error);
    
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      throw new Error(`Transaction failed. Result codes: ${JSON.stringify(codes)}`);
    }
    
    throw new Error(
      error.message || 
      'Failed to submit transaction to the Stellar Network. Check balance and network settings.'
    );
  }
}
