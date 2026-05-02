"""auth system — email verification, phone OTP, password reset, 2FA, transactions, refunds, user fields

Revision ID: a1b2c3d4e5f6
Revises: 634b0222b6dd
Create Date: 2026-05-01 00:00:00.000000
"""
from typing import Union
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '634b0222b6dd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    DO $$
    BEGIN
      BEGIN CREATE TYPE user_status AS ENUM ('active','inactive','suspended','banned');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN CREATE TYPE two_factor_method AS ENUM ('email','sms','totp');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN CREATE TYPE transaction_type AS ENUM ('payment','refund','payout','fee','adjustment');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN CREATE TYPE transaction_status AS ENUM ('pending','completed','failed','cancelled','reversed');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN CREATE TYPE refund_status AS ENUM ('pending','approved','processing','completed','rejected');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN status user_status NOT NULL DEFAULT 'active';
      EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
      EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
      EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT FALSE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_evt_user_id ON email_verification_tokens(user_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_evt_token_hash ON email_verification_tokens(token_hash)")

    op.execute("""
    CREATE TABLE IF NOT EXISTS phone_verification_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      phone VARCHAR(30) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      is_used BOOLEAN NOT NULL DEFAULT FALSE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_pvc_user_id ON phone_verification_codes(user_id)")

    op.execute("""
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT FALSE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_prt_user_id ON password_reset_tokens(user_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_prt_token_hash ON password_reset_tokens(token_hash)")

    op.execute("""
    CREATE TABLE IF NOT EXISTS two_factor_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      method two_factor_method NOT NULL DEFAULT 'totp',
      totp_secret VARCHAR(64),
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      backup_codes JSONB NOT NULL DEFAULT '[]',
      verified_at TIMESTAMPTZ
    )
    """)

    op.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
      payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
      type transaction_type NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status transaction_status NOT NULL DEFAULT 'pending',
      reference VARCHAR(255),
      description TEXT,
      meta JSONB NOT NULL DEFAULT '{}'
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_tx_order_id ON transactions(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tx_payment_id ON transactions(payment_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tx_reference ON transactions(reference)")

    op.execute("""
    CREATE TABLE IF NOT EXISTS refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
      requested_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      processed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC(12,2) NOT NULL,
      reason TEXT NOT NULL,
      status refund_status NOT NULL DEFAULT 'pending',
      stripe_refund_id VARCHAR(255),
      notes TEXT
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_refunds_order_id ON refunds(order_id)")


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS refunds;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS two_factor_settings;
    DROP TABLE IF EXISTS password_reset_tokens;
    DROP TABLE IF EXISTS phone_verification_codes;
    DROP TABLE IF EXISTS email_verification_tokens;
    ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled;
    ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
    ALTER TABLE users DROP COLUMN IF EXISTS status;
    DROP TYPE IF EXISTS refund_status;
    DROP TYPE IF EXISTS transaction_status;
    DROP TYPE IF EXISTS transaction_type;
    DROP TYPE IF EXISTS two_factor_method;
    DROP TYPE IF EXISTS user_status;
    """)
