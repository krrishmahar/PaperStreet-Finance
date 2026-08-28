-- Create an ENUM for strict constraints and space efficiency
DO $$ BEGIN
    CREATE TYPE trade_direction AS ENUM ('BUY', 'SELL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS trades (
    trade_id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(128) NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    quantity BIGINT NOT NULL,
    price NUMERIC(16, 4) NOT NULL,
    order_type trade_direction NOT NULL,
    trade_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B-Tree indexes for fast filtering and time-series sorting
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(trade_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_client ON trades(client_id);
CREATE INDEX IF NOT EXISTS idx_trades_updated_at ON trades(updated_at DESC);
