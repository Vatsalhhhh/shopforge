"""
Database seeder — populates development DB with sample data.
Run with: python scripts/seed.py
Idempotent: safe to run multiple times.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models import Category, Product, User, ProductStatus, UserRole


SAMPLE_CATEGORIES = [
    {"name": "Electronics", "slug": "electronics", "description": "Gadgets and devices"},
    {"name": "Fashion", "slug": "fashion", "description": "Clothing and accessories"},
    {"name": "Beauty", "slug": "beauty", "description": "Skincare and cosmetics"},
    {"name": "Home & Living", "slug": "home-living", "description": "Furniture and decor"},
    {"name": "Sports", "slug": "sports", "description": "Fitness and outdoor"},
]

SAMPLE_PRODUCTS = [
    {
        "title": "Wireless Noise-Cancelling Headphones",
        "slug": "wireless-noise-cancelling-headphones",
        "sku": "ELEC-001",
        "description": "Premium 40-hour battery with industry-leading ANC.",
        "price": "299.00",
        "discount_price": "249.00",
        "stock": 50,
        "status": ProductStatus.active,
        "is_featured": True,
        "brand": "SoundPro",
        "category_slug": "electronics",
        "images": [{"url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", "alt": "Headphones", "is_primary": True}],
    },
    {
        "title": "Premium Silk Blazer",
        "slug": "premium-silk-blazer",
        "sku": "FASH-001",
        "description": "100% silk blazer for the modern professional.",
        "price": "189.00",
        "discount_price": None,
        "stock": 20,
        "status": ProductStatus.active,
        "is_featured": True,
        "brand": "LuxeWear",
        "category_slug": "fashion",
        "images": [{"url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600", "alt": "Blazer", "is_primary": True}],
    },
    {
        "title": "Vitamin C Glow Serum",
        "slug": "vitamin-c-glow-serum",
        "sku": "BEAU-001",
        "description": "20% Vitamin C + hyaluronic acid for radiant skin.",
        "price": "89.00",
        "discount_price": "69.00",
        "stock": 100,
        "status": ProductStatus.active,
        "is_featured": False,
        "brand": "GlowLab",
        "category_slug": "beauty",
        "images": [{"url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", "alt": "Serum", "is_primary": True}],
    },
]


async def get_or_create_user(session: AsyncSession, email: str, **kwargs) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(email=email, **kwargs)
        session.add(user)
    return user


async def get_or_create_category(session: AsyncSession, slug: str, **kwargs) -> Category:
    result = await session.execute(select(Category).where(Category.slug == slug))
    cat = result.scalar_one_or_none()
    if cat is None:
        cat = Category(slug=slug, **kwargs)
        session.add(cat)
    return cat


async def get_or_create_product(session: AsyncSession, sku: str, **kwargs) -> Product:
    result = await session.execute(select(Product).where(Product.sku == sku))
    product = result.scalar_one_or_none()
    if product is None:
        product = Product(sku=sku, **kwargs)
        session.add(product)
    return product


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        await get_or_create_user(
            session,
            email="admin@shopforge.com",
            hashed_password=hash_password("Admin@123456"),
            first_name="Admin",
            last_name="User",
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )

        await get_or_create_user(
            session,
            email="customer@example.com",
            hashed_password=hash_password("Customer@123456"),
            first_name="Jane",
            last_name="Doe",
            role=UserRole.customer,
            is_active=True,
            is_verified=True,
        )

        categories: dict[str, Category] = {}
        for cat_data in SAMPLE_CATEGORIES:
            slug = cat_data["slug"]
            cat = await get_or_create_category(session, **cat_data)
            categories[slug] = cat

        await session.flush()

        for prod_data in SAMPLE_PRODUCTS:
            data = prod_data.copy()
            cat_slug = data.pop("category_slug")
            cat = categories.get(cat_slug)
            await get_or_create_product(session, category_id=cat.id if cat else None, **data)

        await session.commit()

    print("✓ Seed complete")
    print("  Admin:    admin@shopforge.com  / Admin@123456")
    print("  Customer: customer@example.com / Customer@123456")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
