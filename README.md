# ShopForge — Production-Ready E-Commerce Platform

A full-stack, scalable e-commerce platform built with **Next.js 14**, **FastAPI**, **PostgreSQL**, and **Redis**. Designed for real deployment from day one.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query v5, Zustand v5 |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.x async, Alembic |
| Database | PostgreSQL 16 |
| Cache / Rate-limit | Redis 7 |
| Payments | Stripe |
| Auth | JWT (HS256) — 15-min access + 7-day refresh with rotation |
| Infra | Docker, Docker Compose, GitHub Actions CI |

---

## Project Structure

```
shopforge/
├── backend/                  # FastAPI service
│   ├── app/
│   │   ├── api/v1/           # Route handlers (thin layer)
│   │   ├── core/             # Config, security, rate limiting
│   │   ├── db/               # Engine, session, base model
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Redis client, email, S3
│   ├── alembic/              # DB migrations
│   ├── tests/                # pytest test suite
│   ├── scripts/seed.py       # Dev seed data
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js 14 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/     # Home, Products, Product detail, Cart, etc.
│   │   │   ├── (customer)/   # Profile, Orders, Addresses, Wishlist
│   │   │   └── (admin)/      # Admin dashboard, products, orders, users
│   │   ├── components/       # layout/, products/, cart/, ui/
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Axios API client
│   │   ├── store/            # Zustand stores (auth, cart, ui)
│   │   ├── styles/           # globals.css design system
│   │   └── types/            # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/ci.yml  # GitHub Actions CI
├── docker-compose.yml        # Development stack
├── docker-compose.prod.yml   # Production overrides
├── .env.example              # Environment variable template
└── BUSINESS_ROADMAP.md       # Go-to-market guide
```

---

## Quick Start (Local Development)

### Prerequisites

- Docker + Docker Compose v2
- Node.js 22+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### 1. Clone & Configure

```bash
git clone <your-repo-url> shopforge
cd shopforge
cp .env.example .env
```

Edit `.env` — at minimum set `SECRET_KEY`, `POSTGRES_PASSWORD`, and add your Stripe test keys.

### 2. Start with Docker Compose

```bash
docker compose up -d
```

Services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Run DB Migrations + Seed

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed.py
```

Seed creates:
- Admin: `admin@shopforge.com` / `Admin@123456`
- Customer: `customer@shopforge.com` / `Customer@123456`
- 3 categories + 3 sample products

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start Postgres + Redis locally (or use Docker for just those services):
docker compose up postgres redis -d

# Run migrations
alembic upgrade head

# Start dev server (auto-reload)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

---

## Running Tests

### Backend

```bash
cd backend
APP_ENV=test pytest --cov=app -v
```

Tests use SQLite in-memory — no Postgres or Redis needed.

### Frontend

```bash
cd frontend
npx tsc --noEmit    # type check
npm run lint        # ESLint
npm run build       # production build check
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Critical variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing secret (min 32 chars, random in prod) |
| `POSTGRES_PASSWORD` | Database password |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` in prod) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SMTP_HOST/USER/PASSWORD` | Transactional email |
| `AWS_ACCESS_KEY_ID` + `S3_BUCKET_NAME` | Product image uploads |

---

## Production Deployment

```bash
# Build + start with production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run migrations
docker compose exec backend alembic upgrade head
```

**Pre-flight checklist:**
- [ ] `SECRET_KEY` is a cryptographically random 64-char string
- [ ] `APP_ENV=production` is set
- [ ] Stripe keys are live keys (`sk_live_...`)
- [ ] SMTP credentials are real
- [ ] `CORS_ORIGINS` is set to your actual domain(s)
- [ ] PostgreSQL and Redis ports are **not** exposed (handled by `docker-compose.prod.yml`)
- [ ] Reverse proxy (nginx/Caddy/Traefik) handles TLS termination
- [ ] Backups scheduled for Postgres volume

---

## CI/CD

GitHub Actions runs on every push to `main` and `develop`:

1. **Backend**: ruff lint → mypy type check → pytest (SQLite, no external services)
2. **Frontend**: TypeScript check → ESLint → Next.js production build
3. **Docker** (main branch only): builds both images to verify Dockerfiles

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## API Documentation

When the backend is running, interactive API docs are at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Architecture Notes

- **Service/Repository pattern**: routes stay thin; business logic lives in `services/`
- **UUID primary keys**: prevents enumeration attacks on all resources
- **Order item snapshots**: price, title, and SKU frozen at purchase time — product edits never corrupt order history
- **JWT rotation**: refresh tokens are single-use; each refresh issues a new pair
- **Reserved stock**: `reserved_stock` column prevents overselling during concurrent checkouts
- **Soft deletes**: users have a `deleted_at` timestamp; no row is ever hard-deleted
- **Graceful Redis degradation**: rate limiter falls back to in-memory if Redis is unavailable

---

## Contributing

1. Create a feature branch from `develop`
2. Write tests for new backend endpoints (target: >80% coverage)
3. Ensure `npm run build` passes before opening a PR
4. CI must be green — no exceptions

---

## License

MIT
