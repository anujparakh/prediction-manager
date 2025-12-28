-- Rules table for stock prediction rules
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  expression TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
  symbol TEXT NOT NULL,
  quantity_type TEXT NOT NULL CHECK(quantity_type IN ('FIXED', 'PERCENTAGE', 'EXPRESSION')),
  quantity_value TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_user ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_symbol ON rules(symbol);
CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active);
