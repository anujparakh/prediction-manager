-- Recommendations table for rule evaluations
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'EXECUTED', 'DISMISSED')),
  rule_name TEXT NOT NULL,
  rule_expression TEXT NOT NULL,
  evaluated_at INTEGER NOT NULL,
  executed_at INTEGER,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_date ON recommendations(user_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_rule ON recommendations(rule_id);
