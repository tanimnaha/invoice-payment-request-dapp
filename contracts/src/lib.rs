#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, String, Vec, symbol_short
};

// --- DATA STRUCTURES & STORAGE KEYS ---

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Pending = 0,
    Paid = 1,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: String,
    pub creator: Address,
    pub payer: Address,
    pub amount: i128,      // Stored in stroops (1 XLM = 10,000,000 stroops)
    pub due_date: u64,     // Unix timestamp in seconds
    pub description: String,
    pub status: InvoiceStatus,
}

#[contracttype]
pub enum DataKey {
    Invoice(String),
    FreelancerInvoices(Address),
    PayerInvoices(Address),
}

// --- ERROR TYPES ---

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractError {
    InvoiceAlreadyExists = 1,
    InvoiceNotFound = 2,
    InvoiceAlreadyPaid = 3,
    InvalidAmount = 4,
    InvalidDueDate = 5,
    NotPayer = 6,
}

// --- SMART CONTRACT IMPLEMENTATION ---

#[contract]
pub struct InvoiceContract;

#[contractimpl]
impl InvoiceContract {
    /// Create a new invoice payment request.
    /// The freelancer (creator) must authenticate their identity using require_auth.
    pub fn create_invoice(
        env: Env,
        creator: Address,
        id: String,
        payer: Address,
        amount: i128,
        due_date: u64,
        description: String,
    ) -> Result<(), ContractError> {
        // 1. Authenticate the freelancer
        creator.require_auth();

        // 2. Validate input parameters
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if due_date <= env.ledger().timestamp() {
            return Err(ContractError::InvalidDueDate);
        }

        // 3. Ensure the invoice ID is unique
        let invoice_key = DataKey::Invoice(id.clone());
        if env.storage().persistent().has(&invoice_key) {
            return Err(ContractError::InvoiceAlreadyExists);
        }

        // 4. Create and store the invoice
        let invoice = Invoice {
            id: id.clone(),
            creator: creator.clone(),
            payer: payer.clone(),
            amount,
            due_date,
            description,
            status: InvoiceStatus::Pending,
        };
        env.storage().persistent().set(&invoice_key, &invoice);

        // 5. Append to the freelancer's invoice list
        let freelancer_key = DataKey::FreelancerInvoices(creator.clone());
        let mut freelancer_invs: Vec<String> = env
            .storage()
            .persistent()
            .get(&freelancer_key)
            .unwrap_or_else(|| Vec::new(&env));
        freelancer_invs.push_back(id.clone());
        env.storage().persistent().set(&freelancer_key, &freelancer_invs);

        // 6. Append to the payer's invoice list
        let payer_key = DataKey::PayerInvoices(payer.clone());
        let mut payer_invs: Vec<String> = env
            .storage()
            .persistent()
            .get(&payer_key)
            .unwrap_or_else(|| Vec::new(&env));
        payer_invs.push_back(id.clone());
        env.storage().persistent().set(&payer_key, &payer_invs);

        // 7. Emit an event for tracking
        env.events().publish(
            (symbol_short!("create"), id),
            (creator, payer, amount),
        );

        Ok(())
    }

    /// Pay a pending invoice.
    /// The payer must authenticate their identity using require_auth.
    /// Uses the Stellar Asset Contract (SAC) or native token to transfer payment.
    pub fn pay_invoice(
        env: Env,
        payer: Address,
        id: String,
        token_address: Address,
    ) -> Result<(), ContractError> {
        // 1. Retrieve the invoice
        let invoice_key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&invoice_key)
            .ok_or(ContractError::InvoiceNotFound)?;

        // 2. Authenticate the payer
        payer.require_auth();

        // 3. Ensure the caller is the assigned payer
        if payer != invoice.payer {
            return Err(ContractError::NotPayer);
        }

        // 4. Ensure the invoice is not already paid
        if invoice.status == InvoiceStatus::Paid {
            return Err(ContractError::InvoiceAlreadyPaid);
        }

        // 5. Execute the payment using the token client (atomic transfer)
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&payer, &invoice.creator, &invoice.amount);

        // 6. Update the invoice status to Paid
        invoice.status = InvoiceStatus::Paid;
        env.storage().persistent().set(&invoice_key, &invoice);

        // 7. Emit a payment event
        env.events().publish(
            (symbol_short!("pay"), id),
            (payer, invoice.creator, invoice.amount),
        );

        Ok(())
    }

    /// Retrieve an invoice by its unique ID.
    pub fn get_invoice(env: Env, id: String) -> Option<Invoice> {
        env.storage().persistent().get(&DataKey::Invoice(id))
    }

    /// Retrieve all invoices created by a specific freelancer.
    pub fn get_freelancer_invoices(env: Env, freelancer: Address) -> Vec<Invoice> {
        let freelancer_key = DataKey::FreelancerInvoices(freelancer);
        let invoice_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&freelancer_key)
            .unwrap_or_else(|| Vec::new(&env));

        let mut invoices = Vec::new(&env);
        for i in 0..invoice_ids.len() {
            let id = invoice_ids.get(i).unwrap();
            if let Some(invoice) = env.storage().persistent().get::<_, Invoice>(&DataKey::Invoice(id)) {
                invoices.push_back(invoice);
            }
        }
        invoices
    }

    /// Retrieve all invoices assigned to a specific payer.
    pub fn get_payer_invoices(env: Env, payer: Address) -> Vec<Invoice> {
        let payer_key = DataKey::PayerInvoices(payer);
        let invoice_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&payer_key)
            .unwrap_or_else(|| Vec::new(&env));

        let mut invoices = Vec::new(&env);
        for i in 0..invoice_ids.len() {
            let id = invoice_ids.get(i).unwrap();
            if let Some(invoice) = env.storage().persistent().get::<_, Invoice>(&DataKey::Invoice(id)) {
                invoices.push_back(invoice);
            }
        }
        invoices
    }
}

// --- UNIT TESTS ---

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_create_and_pay_invoice() {
        let env = Env::default();
        env.mock_all_auths();

        // 1. Initialize addresses
        let freelancer = Address::generate(&env);
        let payer = Address::generate(&env);

        // Register a mock token contract to simulate XLM SAC
        let token_admin = Address::generate(&env);
        let token_contract_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::TokenClient::new(&env, &token_contract_id);
        let token_admin_client = token::StellarAssetContractClient::new(&env, &token_contract_id);

        // Mint tokens to the payer so they can settle the invoice
        let amount_to_mint = 50_000_000i128; // 5 XLM in stroops
        token_admin_client.mint(&payer, &amount_to_mint);
        assert_eq!(token_client.balance(&payer), amount_to_mint);

        // Register our invoice smart contract
        let contract_id = env.register_contract(None, InvoiceContract);
        let client = InvoiceContractClient::new(&env, &contract_id);

        // Set the block time
        env.ledger().set_timestamp(1000);

        let invoice_id = String::from_str(&env, "INV-001");
        let description = String::from_str(&env, "Development services for project");
        let due_date = 2000u64; // in the future

        // 2. Create invoice
        client.create_invoice(
            &freelancer,
            &invoice_id,
            &payer,
            &40_000_000i128, // 4 XLM in stroops
            &due_date,
            &description,
        );

        // 3. Verify storage retrievals
        let stored_invoice = client.get_invoice(&invoice_id).unwrap();
        assert_eq!(stored_invoice.id, invoice_id);
        assert_eq!(stored_invoice.creator, freelancer);
        assert_eq!(stored_invoice.payer, payer);
        assert_eq!(stored_invoice.amount, 40_000_000i128);
        assert_eq!(stored_invoice.due_date, due_date);
        assert_eq!(stored_invoice.status, InvoiceStatus::Pending);

        // Verify indexing maps
        let freelancer_invoices = client.get_freelancer_invoices(&freelancer);
        assert_eq!(freelancer_invoices.len(), 1);
        assert_eq!(freelancer_invoices.get(0).unwrap().id, invoice_id);

        let payer_invoices = client.get_payer_invoices(&payer);
        assert_eq!(payer_invoices.len(), 1);
        assert_eq!(payer_invoices.get(0).unwrap().id, invoice_id);

        // 4. Pay the invoice
        client.pay_invoice(&payer, &invoice_id, &token_contract_id);

        // 5. Verify status updates and token balances
        let paid_invoice = client.get_invoice(&invoice_id).unwrap();
        assert_eq!(paid_invoice.status, InvoiceStatus::Paid);
        assert_eq!(token_client.balance(&payer), 10_000_000i128);
        assert_eq!(token_client.balance(&freelancer), 40_000_000i128);
    }

    #[test]
    #[should_panic(expected = "HostError: Error(Contract, #4)")] // InvalidAmount
    fn test_create_invoice_invalid_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let freelancer = Address::generate(&env);
        let payer = Address::generate(&env);

        let contract_id = env.register_contract(None, InvoiceContract);
        let client = InvoiceContractClient::new(&env, &contract_id);

        let invoice_id = String::from_str(&env, "INV-002");
        let description = String::from_str(&env, "Test Invoice");

        client.create_invoice(
            &freelancer,
            &invoice_id,
            &payer,
            &-1000i128, // Invalid negative amount
            &2000u64,
            &description,
        );
    }
}
