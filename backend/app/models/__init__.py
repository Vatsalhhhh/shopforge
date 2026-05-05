"""
Import all models here so Alembic autogenerate sees them.
Order matters: base tables must be imported before tables that FK into them.
"""
from app.models.base import TimestampedBase
from app.models.user import Address, User, UserRole, UserStatus
from app.models.auth_tokens import (
    EmailVerificationToken, PhoneVerificationCode,
    PasswordResetToken, TwoFactorSettings, TwoFactorMethod,
)
from app.models.vendor import (
    Vendor, VendorUser, VendorDocument, VendorOrder,
    Shipment, InventoryLog, Payout,
    VendorStatus, VendorUserRole, DocumentType, DocumentStatus,
    VendorOrderStatus, InventoryChangeReason, PayoutStatus,
)
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.transaction import Transaction, Refund, TransactionType, TransactionStatus, RefundStatus
from app.models.review import Review
from app.models.coupon import Coupon, CouponUsage
from app.models.wishlist import WishlistItem
from app.models.audit_log import AuditLog
from app.models.inventory_reservation import InventoryReservation, ReservationStatus

__all__ = [
    "TimestampedBase",
    "User", "UserRole", "UserStatus", "Address",
    "EmailVerificationToken", "PhoneVerificationCode",
    "PasswordResetToken", "TwoFactorSettings", "TwoFactorMethod",
    "Vendor", "VendorUser", "VendorDocument", "VendorOrder",
    "Shipment", "InventoryLog", "Payout",
    "VendorStatus", "VendorUserRole", "DocumentType", "DocumentStatus",
    "VendorOrderStatus", "InventoryChangeReason", "PayoutStatus",
    "Category",
    "Product", "ProductStatus",
    "Cart", "CartItem",
    "Order", "OrderItem", "OrderStatus",
    "Payment", "PaymentStatus",
    "Transaction", "Refund", "TransactionType", "TransactionStatus", "RefundStatus",
    "Review",
    "Coupon", "CouponUsage",
    "WishlistItem",
    "AuditLog",
    "InventoryReservation", "ReservationStatus",
]
