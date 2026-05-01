-- PostgreSQL Schema for NexVault Wallet Service
-- This schema handles all financial transactions, wallet management, and related operations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wallets table (improved from existing)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References users.id from auth service
    balance DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active', -- active, frozen, suspended, closed
    daily_limit DECIMAL(15,2) DEFAULT 10000.00,
    monthly_limit DECIMAL(15,2) DEFAULT 50000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_transaction_at TIMESTAMP,
    version INTEGER DEFAULT 0 -- For optimistic locking
);

-- Transactions table (main transaction record)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(50) UNIQUE NOT NULL, -- Human-readable reference like 'TXN-20240328-001'
    type VARCHAR(20) NOT NULL, -- 'credit', 'debit'
    category VARCHAR(30) NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'refund'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'

    -- Amount details
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(15,2) DEFAULT 0.00 CHECK (fee >= 0),
    net_amount DECIMAL(15,2) NOT NULL, -- amount +/- fee depending on type
    currency VARCHAR(3) DEFAULT 'USD',

    -- Wallet relationships
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    counterparty_wallet_id UUID REFERENCES wallets(id), -- For transfers between wallets
    external_account_id UUID, -- For bank accounts, cards, etc.

    -- Transaction details
    description TEXT,
    notes TEXT,
    metadata JSONB, -- Additional transaction data

    -- External references
    external_reference VARCHAR(100), -- Bank reference, payment gateway ref, etc.
    payment_method VARCHAR(50), -- 'bank_transfer', 'card', 'wallet', 'crypto', etc.

    -- Processing details
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- User who initiated the transaction
    approved_by UUID, -- For transactions requiring approval
    reversed_transaction_id UUID REFERENCES transactions(id) -- For reversals/refunds
);

-- Transaction fees table (detailed fee breakdown)
CREATE TABLE IF NOT EXISTS transaction_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    fee_type VARCHAR(30) NOT NULL, -- 'processing_fee', 'network_fee', 'withdrawal_fee', 'exchange_fee', etc.
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- External accounts table (bank accounts, cards, etc.)
CREATE TABLE IF NOT EXISTS external_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References users.id from auth service
    type VARCHAR(20) NOT NULL, -- 'bank_account', 'credit_card', 'debit_card', 'paypal', etc.
    provider VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer', etc.

    -- Account details
    account_number VARCHAR(100), -- Masked for security
    account_name VARCHAR(100),
    bank_name VARCHAR(100),
    bank_code VARCHAR(20), -- SWIFT/BIC code
    country VARCHAR(2), -- ISO country code

    -- Status and verification
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'suspended'
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,

    -- Security
    last_four VARCHAR(4), -- Last 4 digits for display
    encrypted_data TEXT, -- Encrypted sensitive data

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Transaction logs table (detailed audit trail)
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'processed', 'completed', 'failed', 'reversed', etc.
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_balance DECIMAL(15,2),
    new_balance DECIMAL(15,2),
    details JSONB,
    performed_by UUID, -- System or user ID
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Wallet limits and settings
CREATE TABLE IF NOT EXISTS wallet_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    limit_type VARCHAR(30) NOT NULL, -- 'daily_deposit', 'daily_withdrawal', 'monthly_transfer', etc.
    limit_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    reset_date DATE NOT NULL, -- When the limit resets
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_id, limit_type, reset_date)
);

-- Pending transactions queue (for async processing)
CREATE TABLE IF NOT EXISTS pending_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1, -- 1=low, 5=high
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    locked_until TIMESTAMP, -- For distributed locking
    locked_by VARCHAR(100), -- Worker instance ID
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Currency exchange rates (for multi-currency support)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,8) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'api', 'bank'
    effective_date DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, effective_date)
);

-- Recurring transactions (for scheduled payments)
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    template_transaction_id UUID REFERENCES transactions(id), -- Reference to original transaction
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    next_run_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    current_occurrence INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction categories (for custom categorization)
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References users.id from auth service
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Wallet backup and recovery
CREATE TABLE IF NOT EXISTS wallet_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    backup_type VARCHAR(20) NOT NULL, -- 'manual', 'automatic', 'recovery'
    encrypted_data TEXT NOT NULL, -- Encrypted wallet data
    checksum VARCHAR(128) NOT NULL, -- For integrity verification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty_wallet_id ON transactions(counterparty_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_account_id ON transactions(external_account_id);

CREATE INDEX IF NOT EXISTS idx_transaction_fees_transaction_id ON transaction_fees(transaction_id);

CREATE INDEX IF NOT EXISTS idx_external_accounts_user_id ON external_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_external_accounts_type ON external_accounts(type);
CREATE INDEX IF NOT EXISTS idx_external_accounts_status ON external_accounts(status);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_performed_at ON transaction_logs(performed_at);

CREATE INDEX IF NOT EXISTS idx_wallet_limits_wallet_id ON wallet_limits(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_limits_reset_date ON wallet_limits(reset_date);

CREATE INDEX IF NOT EXISTS idx_pending_transactions_transaction_id ON pending_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_next_retry_at ON pending_transactions(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_locked_until ON pending_transactions(locked_until);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to_currency ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_date ON exchange_rates(effective_date);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_wallet_id ON recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_run_date ON recurring_transactions(next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_status ON recurring_transactions(status);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_user_id ON transaction_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_backups_wallet_id ON wallet_backups(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_backups_is_active ON wallet_backups(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_accounts_updated_at BEFORE UPDATE ON external_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_limits_updated_at BEFORE UPDATE ON wallet_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_transactions_updated_at BEFORE UPDATE ON pending_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        ref := 'TXN-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM transactions WHERE reference = ref) INTO exists_check;
        IF NOT exists_check THEN
            RETURN ref;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(p_wallet_id UUID, p_amount DECIMAL, p_type VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    current_balance DECIMAL;
    new_balance DECIMAL;
BEGIN
    -- Get current balance with row locking
    SELECT balance INTO current_balance
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Calculate new balance
    IF p_type = 'credit' THEN
        new_balance := current_balance + p_amount;
    ELSIF p_type = 'debit' THEN
        IF current_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance';
        END IF;
        new_balance := current_balance - p_amount;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type';
    END IF;

    -- Update wallet
    UPDATE wallets
    SET balance = new_balance,
        updated_at = CURRENT_TIMESTAMP,
        last_transaction_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE id = p_wallet_id;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to process transaction
CREATE OR REPLACE FUNCTION process_transaction(
    p_transaction_id UUID,
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_fee DECIMAL DEFAULT 0,
    p_type VARCHAR
) RETURNS VOID AS $$
DECLARE
    net_amount DECIMAL;
    new_balance DECIMAL;
BEGIN
    -- Calculate net amount
    IF p_type = 'credit' THEN
        net_amount := p_amount - p_fee;
    ELSE
        net_amount := p_amount + p_fee;
    END IF;

    -- Update wallet balance
    new_balance := update_wallet_balance(p_wallet_id, net_amount, p_type);

    -- Update transaction
    UPDATE transactions
    SET status = 'completed',
        processed_at = CURRENT_TIMESTAMP,
        completed_at = CURRENT_TIMESTAMP,
        net_amount = CASE WHEN p_type = 'credit' THEN p_amount - p_fee ELSE p_amount + p_fee END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_transaction_id;

    -- Log the transaction
    INSERT INTO transaction_logs (
        transaction_id,
        action,
        old_status,
        new_status,
        new_balance,
        details,
        performed_by
    ) VALUES (
        p_transaction_id,
        'completed',
        'processing',
        'completed',
        new_balance,
        jsonb_build_object('processed_amount', net_amount, 'fee', p_fee),
        'system'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Mark transaction as failed
        UPDATE transactions
        SET status = 'failed',
            failed_at = CURRENT_TIMESTAMP,
            failure_reason = SQLERRM,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_transaction_id;

        -- Log the failure
        INSERT INTO transaction_logs (
            transaction_id,
            action,
            old_status,
            new_status,
            details,
            performed_by
        ) VALUES (
            p_transaction_id,
            'failed',
            'processing',
            'failed',
            jsonb_build_object('error', SQLERRM),
            'system'
        );

        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired pending transactions
CREATE OR REPLACE FUNCTION cleanup_expired_pending_transactions()
RETURNS void AS $$
BEGIN
    -- Mark expired pending transactions as failed
    UPDATE transactions
    SET status = 'failed',
        failed_at = CURRENT_TIMESTAMP,
        failure_reason = 'Transaction expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT pt.transaction_id
        FROM pending_transactions pt
        WHERE pt.next_retry_at < CURRENT_TIMESTAMP
        AND pt.retry_count >= pt.max_retries
    )
    AND status = 'pending';

    -- Remove processed pending transactions
    DELETE FROM pending_transactions
    WHERE transaction_id IN (
        SELECT id FROM transactions WHERE status IN ('completed', 'failed', 'cancelled')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily/monthly limits
CREATE OR REPLACE FUNCTION reset_wallet_limits()
RETURNS void AS $$
BEGIN
    -- Reset daily limits
    UPDATE wallet_limits
    SET current_amount = 0,
        reset_date = CURRENT_DATE + INTERVAL '1 day',
        updated_at = CURRENT_TIMESTAMP
    WHERE reset_date <= CURRENT_DATE
    AND limit_type LIKE 'daily_%';

    -- Reset monthly limits (simplified - assumes monthly reset on the 1st)
    UPDATE wallet_limits
    SET current_amount = 0,
        reset_date = DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'),
        updated_at = CURRENT_TIMESTAMP
    WHERE reset_date <= CURRENT_DATE
    AND limit_type LIKE 'monthly_%'
    AND EXTRACT(DAY FROM CURRENT_DATE) = 1;
END;
$$ LANGUAGE plpgsql;