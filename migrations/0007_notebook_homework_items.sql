-- Task #105: notebook homework items table for guardian-checkable homework tracking
-- journal_id 는 현재 in-memory trainingJournals 의 논리적 ID이므로 DB FK 미적용.
-- 트레이닝 저널 자체의 영속화는 후속 작업으로 분리.
CREATE TABLE IF NOT EXISTS notebook_homework_items (
  id SERIAL PRIMARY KEY,
  journal_id INTEGER NOT NULL,
  label VARCHAR(200) NOT NULL,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by_user_id INTEGER REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notebook_homework_items_journal_idx
  ON notebook_homework_items(journal_id);

-- 기존 환경에서 FK가 이미 생성되어 있을 수 있으므로 안전하게 제거
ALTER TABLE notebook_homework_items
  DROP CONSTRAINT IF EXISTS notebook_homework_items_journal_id_training_journals_id_fk;
ALTER TABLE notebook_homework_items
  DROP CONSTRAINT IF EXISTS notebook_homework_items_journal_id_fkey;
