import {
  rpc,
  TransactionBuilder,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
  Horizon
} from '@stellar/stellar-sdk';
import { getNetworkConfig, signAndSubmitTransaction } from './stellar';

const { rpcUrl, networkPassphrase, horizonUrl } = getNetworkConfig();
const rpcServer = new rpc.Server(rpcUrl);

// Read from process.env, fallback to a placeholder if not set yet during build
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || '';
// XLM Native Token contract address on Stellar Testnet
const XLM_TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJGWUVNUR2G4KMT52JUQKGW5AX3CEGCHB';

// Minimal stub for Account if loading from Horizon fails (e.g. un-funded accounts)
class Account {
  private _accountId: string;
  private _sequence: string;

  constructor(accountId: string, sequence: string) {
    this._accountId = accountId;
    this._sequence = sequence;
  }

  accountId(): string {
    return this._accountId;
  }

  sequenceNumber(): string {
    return this._sequence;
  }

  incrementSequenceNumber(): void {
    this._sequence = (BigInt(this._sequence) + 1n).toString();
  }
}

export interface InvoiceData {
  id: string;
  creator: string;
  payer: string;
  amount: bigint;      // stroops
  due_date: bigint;    // timestamp seconds
  description: string;
  status: 'Pending' | 'Paid';
}

/**
 * Parses the Invoice custom type returned from Soroban into a clean JS object.
 */
function parseInvoice(raw: any): InvoiceData {
  let statusVal: 'Pending' | 'Paid' = 'Pending';
  
  if (raw.status) {
    if (typeof raw.status === 'string') {
      statusVal = raw.status === 'Paid' ? 'Paid' : 'Pending';
    } else if (typeof raw.status === 'object') {
      // In some versions of scValToNative, enums resolve as { name: 'Paid', value: ... }
      if (raw.status.name === 'Paid') {
        statusVal = 'Paid';
      } else if (raw.status.name === 'Pending') {
        statusVal = 'Pending';
      } else {
        // Fallback for key-based variant check
        const keys = Object.keys(raw.status);
        if (keys.includes('Paid')) {
          statusVal = 'Paid';
        } else if (keys.includes('Pending')) {
          statusVal = 'Pending';
        }
      }
    }
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : raw.id.toString(),
    creator: typeof raw.creator === 'string' ? raw.creator : raw.creator.toString(),
    payer: typeof raw.payer === 'string' ? raw.payer : raw.payer.toString(),
    amount: typeof raw.amount === 'bigint' ? raw.amount : BigInt(raw.amount || 0),
    due_date: typeof raw.due_date === 'bigint' ? raw.due_date : BigInt(raw.due_date || 0),
    description: typeof raw.description === 'string' ? raw.description : raw.description.toString(),
    status: statusVal,
  };
}

/**
 * Validates that the contract ID is configured in env.
 */
function checkContractConfigured() {
  if (!CONTRACT_ID) {
    throw new Error(
      'NEXT_PUBLIC_CONTRACT_ID environment variable is not configured. ' +
      'Please deploy the contract and add it to your .env.local file.'
    );
  }
}

/**
 * Read-only: Get specific invoice by ID.
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceData | null> {
  checkContractConfigured();
  
  const contract = new Contract(CONTRACT_ID);
  
  // Create an arbitrary source account to simulate
  const tempKeyPair = Address.fromString('GDFDGJ5AOKX5FCPB2TLT5A6X4SZ3Z6SFFG2C37RIV336M6AJSOC7Z4CS');
  const horizonServer = new Horizon.Server(horizonUrl);
  let account;
  try {
    account = await horizonServer.loadAccount(tempKeyPair.toString());
  } catch {
    // If account doesn't exist, we can use a dummy Account object
    account = new Account(tempKeyPair.toString(), '0');
  }

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      contract.call('get_invoice', xdr.ScVal.scvString(invoiceId))
    )
    .setTimeout(30)
    .build();

  try {
    const simulation = await rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simulation) && simulation.result) {
      const rawNative = scValToNative(simulation.result.retval);
      if (!rawNative) return null;
      return parseInvoice(rawNative);
    }
    return null;
  } catch (error) {
    console.error('Error in getInvoice:', error);
    return null;
  }
}

/**
 * Read-only: Get all invoices created by a freelancer.
 */
export async function getFreelancerInvoices(freelancer: string): Promise<InvoiceData[]> {
  checkContractConfigured();
  
  const contract = new Contract(CONTRACT_ID);
  const tempKeyPair = Address.fromString('GDFDGJ5AOKX5FCPB2TLT5A6X4SZ3Z6SFFG2C37RIV336M6AJSOC7Z4CS');
  const horizonServer = new Horizon.Server(horizonUrl);
  let account;
  try {
    account = await horizonServer.loadAccount(tempKeyPair.toString());
  } catch {
    account = new Account(tempKeyPair.toString(), '0');
  }

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      contract.call('get_freelancer_invoices', Address.fromString(freelancer).toScVal())
    )
    .setTimeout(30)
    .build();

  try {
    const simulation = await rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simulation) && simulation.result) {
      const rawNative = scValToNative(simulation.result.retval);
      if (!Array.isArray(rawNative)) return [];
      return rawNative.map(parseInvoice);
    }
    return [];
  } catch (error) {
    console.error('Error in getFreelancerInvoices:', error);
    return [];
  }
}

/**
 * Read-only: Get all invoices assigned to a payer.
 */
export async function getPayerInvoices(payer: string): Promise<InvoiceData[]> {
  checkContractConfigured();
  
  const contract = new Contract(CONTRACT_ID);
  const tempKeyPair = Address.fromString('GDFDGJ5AOKX5FCPB2TLT5A6X4SZ3Z6SFFG2C37RIV336M6AJSOC7Z4CS');
  const horizonServer = new Horizon.Server(horizonUrl);
  let account;
  try {
    account = await horizonServer.loadAccount(tempKeyPair.toString());
  } catch {
    account = new Account(tempKeyPair.toString(), '0');
  }

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      contract.call('get_payer_invoices', Address.fromString(payer).toScVal())
    )
    .setTimeout(30)
    .build();

  try {
    const simulation = await rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simulation) && simulation.result) {
      const rawNative = scValToNative(simulation.result.retval);
      if (!Array.isArray(rawNative)) return [];
      return rawNative.map(parseInvoice);
    }
    return [];
  } catch (error) {
    console.error('Error in getPayerInvoices:', error);
    return [];
  }
}

/**
 * Write: Create a new invoice on-chain.
 */
export async function createInvoice(
  creatorAddress: string,
  invoiceId: string,
  payerAddress: string,
  amountInXlm: number,
  dueDateTimestamp: number,
  description: string
): Promise<any> {
  checkContractConfigured();
  
  const contract = new Contract(CONTRACT_ID);
  const amountInStroops = Math.round(amountInXlm * 10_000_000);
  
  const horizonServer = new Horizon.Server(horizonUrl);
  
  // 1. Load the freelancer's account (creator) to construct transaction
  const account = await horizonServer.loadAccount(creatorAddress);
  
  // 2. Build the initial transaction
  const tx = new TransactionBuilder(account, {
    fee: '100000', // generous initial fee
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'create_invoice',
        Address.fromString(creatorAddress).toScVal(),
        xdr.ScVal.scvString(invoiceId),
        Address.fromString(payerAddress).toScVal(),
        nativeToScVal(BigInt(amountInStroops), { type: 'i128' }),
        nativeToScVal(BigInt(dueDateTimestamp), { type: 'u64' }),
        xdr.ScVal.scvString(description)
      )
    )
    .setTimeout(180)
    .build();

  // 3. Prepare transaction (simulates and fills footprints + fees)
  try {
    const preparedTx = await rpcServer.prepareTransaction(tx);
    const xdrString = preparedTx.toXDR();
    
    // 4. Request Freighter signature & submit to Horizon
    return await signAndSubmitTransaction(xdrString);
  } catch (error: any) {
    console.error('Error in createInvoice:', error);
    throw new Error(error.message || 'Failed to simulate or build create_invoice transaction');
  }
}

/**
 * Write: Pay a pending invoice on-chain.
 */
export async function payInvoice(
  payerAddress: string,
  invoiceId: string
): Promise<any> {
  checkContractConfigured();
  
  const contract = new Contract(CONTRACT_ID);
  const horizonServer = new Horizon.Server(horizonUrl);
  
  // 1. Load the payer's account to construct transaction
  const account = await horizonServer.loadAccount(payerAddress);
  
  // 2. Build the initial transaction
  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        'pay_invoice',
        Address.fromString(payerAddress).toScVal(),
        xdr.ScVal.scvString(invoiceId),
        Address.fromString(XLM_TOKEN_ADDRESS).toScVal()
      )
    )
    .setTimeout(180)
    .build();

  // 3. Prepare transaction (simulates and fills footprints + fees)
  try {
    const preparedTx = await rpcServer.prepareTransaction(tx);
    const xdrString = preparedTx.toXDR();
    
    // 4. Request Freighter signature & submit to Horizon
    return await signAndSubmitTransaction(xdrString);
  } catch (error: any) {
    console.error('Error in payInvoice:', error);
    throw new Error(error.message || 'Failed to simulate or build pay_invoice transaction');
  }
}
