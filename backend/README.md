# ShopForge Backend

FastAPI + PostgreSQL + Redis backend for the ShopForge e-commerce platform.

## Quick Start (Local Dev)

```bash
# 1. Create virtual environment
python3.12 -m venv .venv        # Python 3.12+ recommended
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and configure environment
cp ../.env.example ../.env
# Edit .env — at minimum set POSTGRES_* and REDIS_* values

# 4. Run database migrations
alembic upgrade head

# 5. Seed sample data (optional)
python scripts/seed.py

# 6. Start development server
uvicorn app.main:app --reload --port 8000
```

API docs (dev only): http://localhost:8000/api/docs

## Running Tests

```bash
APP_ENV=test pytest tests/ -v
```

## Database Migrations

```bash
# Create a new migration after model changes
alembic revision --autogenerate -m "describe change here"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history
```

## Project Structure

```
app/
├── api/v1/          — route handlers (thin: validate input, call service, return response)
├── core/            — config, security, RBAC, rate limiting
├── db/              — SQLAlchemy engine and session dependency
├── models/          — ORM models (PostgreSQL schema)
├── schemas/         — Pydantic request/response models
├── services/        — all business logic
├── repositories/    — database queries (no business logic)
├── utils/           — pagination, slugify, Redis client, logging
└── workers/         — background tasks (email, stock sync)
```

## Environment Variables

See `../.env.example` for all available settings. Key variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing key (32+ random bytes) |
| `DATABASE_URL` | Auto-built from `POSTGRES_*` vars |
| `REDIS_URL` | Auto-built from `REDIS_*` vars |
| `STRIPE_SECRET_KEY` | Stripe API key (sk_test_... or sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Docker

```bash
# Build image
docker build -t shopforge-backend .

# Or use docker-compose from root
docker-compose up backend
```

## API Health Checks

- `GET /api/v1/health` — liveness probe (always 200 if process is running)
- `GET /api/v1/health/ready` — readiness probe (checks DB + Redis)
