import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Generator, Literal, Optional

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import Column, String, inspect, text
from sqlmodel import Field, Session, SQLModel, create_engine, select

load_dotenv(Path(__file__).resolve().parent / ".env")


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "ass1db")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-for-assignment-2")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=False)
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# User tables and login data.
class UserBase(SQLModel):
    username: str = Field(min_length=3, max_length=80)
    email: str = Field(max_length=120)


class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(
        sa_column=Column(String(80), unique=True, index=True, nullable=False)
    )
    email: str = Field(
        sa_column=Column(String(120), unique=True, index=True, nullable=False)
    )
    hashed_password: str = Field(max_length=255)
    role: str = Field(default="customer", max_length=20)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=72)


class UserLogin(SQLModel):
    username: str
    password: str


class UserRead(UserBase):
    id: int
    role: str
    created_at: datetime


class UserRoleUpdate(SQLModel):
    # Super admin can change users between customer and admin.
    role: Literal["customer", "admin"]


class AdminUserRead(UserRead):
    # Extra user data for admin user management.
    cart_items: int
    cart_total: float


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# Product data for the store.
class ProductBase(SQLModel):
    name: str = Field(max_length=120)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0)
    image_url: str = Field(default="", max_length=255)
    stock: int = Field(default=0, ge=0)


class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(SQLModel):
    name: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    price: Optional[float] = Field(default=None, gt=0)
    image_url: Optional[str] = Field(default=None, max_length=255)
    stock: Optional[int] = Field(default=None, ge=0)


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    review_count: int = 0
    average_rating: float = 0.0


# Cart item links user and product.
class CartItemBase(SQLModel):
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1, ge=1)


class CartItem(CartItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(SQLModel):
    quantity: int = Field(ge=1)


class CartItemRead(SQLModel):
    id: int
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    stock: int
    subtotal: float


class AdminUserCartRead(SQLModel):
    user: UserRead
    items: list[CartItemRead]
    total_items: int
    total_price: float


# Wishlist items let customers save products for later.
class WishlistItemBase(SQLModel):
    product_id: int = Field(foreign_key="product.id")


class WishlistItem(WishlistItemBase, table=True):
    __tablename__ = "wishlist_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class WishlistItemRead(SQLModel):
    id: int
    product_id: int
    product_name: str
    product_price: float
    product_image_url: str
    created_at: datetime


# Reviews help customers rate products and leave feedback.
class ReviewBase(SQLModel):
    product_id: int = Field(foreign_key="product.id")
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=500)


class Review(ReviewBase, table=True):
    __tablename__ = "reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(SQLModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)


class ReviewRead(SQLModel):
    id: int
    user_id: int
    username: str
    product_id: int
    product_name: str
    rating: int
    comment: str
    created_at: datetime
    updated_at: datetime


# Coupons give admins a simple discount workflow.
class CouponBase(SQLModel):
    code: str = Field(max_length=40)
    discount_percent: int = Field(ge=1, le=100)
    is_active: bool = True
    expiry_date: Optional[datetime] = None


class Coupon(CouponBase, table=True):
    __tablename__ = "coupons"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class CouponCreate(CouponBase):
    pass


class CouponUpdate(SQLModel):
    code: Optional[str] = Field(default=None, max_length=40)
    discount_percent: Optional[int] = Field(default=None, ge=1, le=100)
    is_active: Optional[bool] = None
    expiry_date: Optional[datetime] = None


class CouponRead(CouponBase):
    id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime


class CartCoupon(SQLModel, table=True):
    __tablename__ = "cart_coupons"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id", unique=True)
    coupon_id: Optional[int] = Field(default=None, foreign_key="coupons.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class CartSummaryRead(SQLModel):
    subtotal: float
    discount_amount: float
    total: float
    coupon: Optional[CouponRead] = None


# Orders are created after a customer checks out.
class OrderBase(SQLModel):
    delivery_address: str = Field(max_length=500)
    subtotal: float = Field(default=0, ge=0)
    discount_amount: float = Field(default=0, ge=0)
    total: float = Field(default=0, ge=0)
    payment_status: str = Field(default="paid", max_length=30)
    order_status: str = Field(default="paid", max_length=30)


class Order(OrderBase, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id")
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    product_name: str = Field(max_length=120)
    unit_price: float = Field(ge=0)
    quantity: int = Field(ge=1)
    subtotal: float = Field(ge=0)


class CheckoutCreate(SQLModel):
    # Card details are only checked, not saved.
    cardholder_name: str = Field(min_length=2, max_length=120)
    card_number: str = Field(min_length=12, max_length=19)
    expiry: str = Field(min_length=4, max_length=7)
    cvv: str = Field(min_length=3, max_length=4)
    delivery_address: str = Field(min_length=5, max_length=500)


class OrderItemRead(SQLModel):
    id: int
    product_id: Optional[int]
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float


class OrderRead(OrderBase):
    id: int
    user_id: int
    username: str
    items: list[OrderItemRead]
    created_at: datetime


class OrderStatusUpdate(SQLModel):
    order_status: Literal["paid", "packed", "shipped", "cancelled"]


# Sample products for first run.
SAMPLE_PRODUCTS = [
    ProductCreate(
        name="Wireless Mouse",
        description="A compact wireless mouse for study and work.",
        price=29.90,
        stock=20,
    ),
    ProductCreate(
        name="Mechanical Keyboard",
        description="A tactile keyboard with backlit keys.",
        price=89.00,
        stock=12,
    ),
    ProductCreate(
        name="Laptop Stand",
        description="An adjustable stand for better desk ergonomics.",
        price=39.50,
        stock=15,
    ),
]


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def initialize_database() -> None:
    create_db_and_tables()
    migrate_cart_items_user_id()
    with Session(engine) as session:
        seed_products(session)


def migrate_cart_items_user_id() -> None:
    # Add user_id if old cart table does not have it.
    inspector = inspect(engine)
    if not inspector.has_table("cartitem"):
        return

    column_names = {column["name"] for column in inspector.get_columns("cartitem")}
    if "user_id" in column_names:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE cartitem ADD COLUMN user_id INT NULL"))


def get_password_hash(password: str) -> str:
    # Hash password before saving.
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    # Put user id inside the token.
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
    return session.get(User, user_id)


def get_user_by_username(session: Session, username: str) -> Optional[User]:
    statement = select(User).where(User.username == username.strip().lower())
    return session.exec(statement).first()


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    statement = select(User).where(User.email == email.strip().lower())
    return session.exec(statement).first()


def create_user(session: Session, user_create: UserCreate) -> User:
    # Clean username and email before saving.
    username = user_create.username.strip().lower()
    email = user_create.email.strip().lower()

    if get_user_by_username(session, username):
        raise ValueError("Username is already registered.")

    if get_user_by_email(session, email):
        raise ValueError("Email is already registered.")

    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(user_create.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(session, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_login_token(user: User) -> Token:
    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token, user=UserRead.model_validate(user))


def get_user_from_token(session: Session, token: str) -> Optional[User]:
    # Read token and find the user.
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return get_user_by_id(session, int(user_id))
    except (JWTError, ValueError):
        return None


def get_users(session: Session) -> list[User]:
    return list(session.exec(select(User).order_by(User.created_at.desc())).all())


def _get_user_cart_summary(session: Session, user_id: int) -> tuple[int, float]:
    # Count this user's cart items for the admin table.
    cart_items = get_cart_items(session, user_id)
    total_items = sum(item.quantity for item in cart_items)
    total_price = round(sum(item.subtotal for item in cart_items), 2)
    return total_items, total_price


def get_admin_users(session: Session) -> list[AdminUserRead]:
    # Admin user list with cart summary.
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    admin_users: list[AdminUserRead] = []

    for user in users:
        total_items, total_price = _get_user_cart_summary(session, user.id)
        admin_users.append(
            AdminUserRead(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role,
                created_at=user.created_at,
                cart_items=total_items,
                cart_total=total_price,
            )
        )

    return admin_users


def _normalize_code(code: str) -> str:
    return code.strip().upper()


def _is_coupon_active(coupon: Coupon) -> bool:
    if not coupon.is_active:
        return False
    if coupon.expiry_date and coupon.expiry_date <= datetime.utcnow():
        return False
    return True


def _validate_coupon_expiry(expiry_date: Optional[datetime]) -> Optional[datetime]:
    # Coupon expiry should be now or in the future.
    if not expiry_date:
        return None

    if expiry_date.tzinfo:
        expiry_date = expiry_date.astimezone(timezone.utc).replace(tzinfo=None)

    if expiry_date < datetime.utcnow():
        raise ValueError("Coupon expiry date cannot be in the past.")

    return expiry_date


def get_coupon_by_id(session: Session, coupon_id: int) -> Optional[Coupon]:
    return session.get(Coupon, coupon_id)


def get_coupon_by_code(session: Session, code: str) -> Optional[Coupon]:
    statement = select(Coupon).where(Coupon.code == _normalize_code(code))
    return session.exec(statement).first()


def get_coupon_read(coupon: Coupon) -> CouponRead:
    return CouponRead.model_validate(coupon)


def get_coupons(session: Session, active_only: bool = False) -> list[CouponRead]:
    statement = select(Coupon).order_by(Coupon.created_at.desc())
    coupons = list(session.exec(statement).all())
    if active_only:
        coupons = [coupon for coupon in coupons if _is_coupon_active(coupon)]
    return [get_coupon_read(coupon) for coupon in coupons]


def create_coupon(
    session: Session, coupon_create: CouponCreate, created_by: Optional[int] = None
) -> Coupon:
    code = _normalize_code(coupon_create.code)
    expiry_date = _validate_coupon_expiry(coupon_create.expiry_date)
    if get_coupon_by_code(session, code):
        raise ValueError("Coupon code is already registered.")

    coupon = Coupon(
        code=code,
        discount_percent=coupon_create.discount_percent,
        is_active=coupon_create.is_active,
        expiry_date=expiry_date,
        created_by=created_by,
    )
    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon


def update_coupon(
    session: Session, coupon_id: int, coupon_update: CouponUpdate
) -> Optional[Coupon]:
    coupon = get_coupon_by_id(session, coupon_id)
    if not coupon:
        return None

    update_data = coupon_update.model_dump(exclude_unset=True)
    if "code" in update_data:
        update_data["code"] = _normalize_code(update_data["code"])
        existing_coupon = get_coupon_by_code(session, update_data["code"])
        if existing_coupon and existing_coupon.id != coupon_id:
            raise ValueError("Coupon code is already registered.")

    if "expiry_date" in update_data:
        update_data["expiry_date"] = _validate_coupon_expiry(update_data["expiry_date"])

    for key, value in update_data.items():
        setattr(coupon, key, value)

    coupon.updated_at = datetime.utcnow()
    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon


def delete_coupon(session: Session, coupon_id: int) -> bool:
    coupon = get_coupon_by_id(session, coupon_id)
    if not coupon:
        return False

    cart_coupons = session.exec(
        select(CartCoupon).where(CartCoupon.coupon_id == coupon_id)
    ).all()
    for cart_coupon in cart_coupons:
        session.delete(cart_coupon)

    session.delete(coupon)
    session.commit()
    return True


def get_cart_coupon(session: Session, user_id: int) -> Optional[CartCoupon]:
    statement = select(CartCoupon).where(CartCoupon.user_id == user_id)
    return session.exec(statement).first()


def apply_coupon_to_cart(
    session: Session, user_id: int, code: str
) -> CartSummaryRead:
    coupon = get_coupon_by_code(session, code)
    if not coupon:
        raise ValueError("Invalid coupon code.")
    if not _is_coupon_active(coupon):
        raise ValueError("Invalid coupon code.")

    cart_coupon = get_cart_coupon(session, user_id)
    if cart_coupon:
        cart_coupon.coupon_id = coupon.id
        session.add(cart_coupon)
    else:
        session.add(CartCoupon(user_id=user_id, coupon_id=coupon.id))

    session.commit()
    return get_cart_summary(session, user_id)


def get_cart_summary(session: Session, user_id: int) -> CartSummaryRead:
    cart_items = get_cart_items(session, user_id)
    subtotal = round(sum(item.subtotal for item in cart_items), 2)
    discount_amount = 0.0
    coupon_read: Optional[CouponRead] = None

    cart_coupon = get_cart_coupon(session, user_id)
    if cart_coupon and cart_coupon.coupon_id:
        coupon = get_coupon_by_id(session, cart_coupon.coupon_id)
        if coupon and _is_coupon_active(coupon):
            coupon_read = get_coupon_read(coupon)
            discount_amount = round(
                subtotal * coupon.discount_percent / 100, 2
            )

    total = round(max(subtotal - discount_amount, 0.0), 2)
    return CartSummaryRead(
        subtotal=subtotal,
        discount_amount=discount_amount,
        total=total,
        coupon=coupon_read,
    )


def remove_coupon_from_cart(session: Session, user_id: int) -> bool:
    cart_coupon = get_cart_coupon(session, user_id)
    if not cart_coupon:
        return False

    session.delete(cart_coupon)
    session.commit()
    return True


def _validate_mock_payment(checkout: CheckoutCreate) -> None:
    # Simple checks for mock payment only.
    card_number = checkout.card_number.replace(" ", "")
    if not card_number.isdigit():
        raise ValueError("Card number must contain numbers only.")

    cvv = checkout.cvv.strip()
    if not cvv.isdigit():
        raise ValueError("CVV must contain numbers only.")


def _build_order_read(session: Session, order: Order) -> OrderRead:
    user = get_user_by_id(session, order.user_id or 0)
    if not user:
        raise ValueError("Order references missing user.")

    order_items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order.id)
    ).all()

    return OrderRead(
        id=order.id,
        user_id=user.id,
        username=user.username,
        delivery_address=order.delivery_address,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        total=order.total,
        payment_status=order.payment_status,
        order_status=order.order_status,
        created_at=order.created_at,
        items=[
            OrderItemRead(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                subtotal=item.subtotal,
            )
            for item in order_items
        ],
    )


def create_checkout_order(
    session: Session, user_id: int, checkout: CheckoutCreate
) -> OrderRead:
    # Turn the cart into an order after mock payment.
    _validate_mock_payment(checkout)
    cart_items = session.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all()
    if not cart_items:
        raise ValueError("Your cart is empty.")

    summary = get_cart_summary(session, user_id)
    order = Order(
        user_id=user_id,
        delivery_address=checkout.delivery_address.strip(),
        subtotal=summary.subtotal,
        discount_amount=summary.discount_amount,
        total=summary.total,
        payment_status="paid",
        order_status="paid",
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    for cart_item in cart_items:
        product = get_product_by_id(session, cart_item.product_id)
        if not product:
            raise ValueError("Product not found for cart item.")
        if cart_item.quantity > product.stock:
            raise ValueError(f"Only {product.stock} item(s) are available for {product.name}.")

        product.stock -= cart_item.quantity
        session.add(product)
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                unit_price=product.price,
                quantity=cart_item.quantity,
                subtotal=round(product.price * cart_item.quantity, 2),
            )
        )
        session.delete(cart_item)

    cart_coupon = get_cart_coupon(session, user_id)
    if cart_coupon:
        session.delete(cart_coupon)

    session.commit()
    session.refresh(order)
    return _build_order_read(session, order)


def get_orders_for_user(session: Session, user_id: int) -> list[OrderRead]:
    orders = session.exec(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    ).all()
    return [_build_order_read(session, order) for order in orders]


def get_all_orders(session: Session) -> list[OrderRead]:
    orders = session.exec(select(Order).order_by(Order.created_at.desc())).all()
    return [_build_order_read(session, order) for order in orders]


def update_order_status(
    session: Session, order_id: int, status_update: OrderStatusUpdate
) -> Optional[OrderRead]:
    order = session.get(Order, order_id)
    if not order:
        return None

    order.order_status = status_update.order_status
    session.add(order)
    session.commit()
    session.refresh(order)
    return _build_order_read(session, order)


def _get_review_by_id(session: Session, review_id: int) -> Optional[Review]:
    return session.get(Review, review_id)


def _build_review_read(session: Session, review: Review) -> ReviewRead:
    product = get_product_by_id(session, review.product_id)
    user = get_user_by_id(session, review.user_id or 0)
    if not product or not user:
        raise ValueError("Review references missing data.")

    return ReviewRead(
        id=review.id,
        user_id=user.id,
        username=user.username,
        product_id=product.id,
        product_name=product.name,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


def get_product_reviews(session: Session, product_id: int) -> list[ReviewRead]:
    reviews = session.exec(
        select(Review)
        .where(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
    ).all()
    return [_build_review_read(session, review) for review in reviews]


def get_product_review_stats(session: Session, product_id: int) -> tuple[int, float]:
    reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
    if not reviews:
        return 0, 0.0

    average_rating = round(sum(review.rating for review in reviews) / len(reviews), 2)
    return len(reviews), average_rating


def build_product_read(session: Session, product: Product) -> ProductRead:
    review_count, average_rating = get_product_review_stats(session, product.id)
    return ProductRead(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        image_url=product.image_url,
        stock=product.stock,
        created_at=product.created_at,
        review_count=review_count,
        average_rating=average_rating,
    )


def add_wishlist_item(session: Session, user_id: int, product_id: int) -> WishlistItemRead:
    product = get_product_by_id(session, product_id)
    if not product:
        raise ValueError("Product not found.")

    existing = session.exec(
        select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
    ).first()
    if existing:
        return WishlistItemRead(
            id=existing.id,
            product_id=product.id,
            product_name=product.name,
            product_price=product.price,
            product_image_url=product.image_url,
            created_at=existing.created_at,
        )

    wishlist_item = WishlistItem(user_id=user_id, product_id=product_id)
    session.add(wishlist_item)
    session.commit()
    session.refresh(wishlist_item)
    return WishlistItemRead(
        id=wishlist_item.id,
        product_id=product.id,
        product_name=product.name,
        product_price=product.price,
        product_image_url=product.image_url,
        created_at=wishlist_item.created_at,
    )


def get_wishlist_items(session: Session, user_id: int) -> list[WishlistItemRead]:
    wishlist_items = session.exec(
        select(WishlistItem)
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
    ).all()
    items: list[WishlistItemRead] = []
    for wishlist_item in wishlist_items:
        product = get_product_by_id(session, wishlist_item.product_id)
        if not product:
            continue
        items.append(
            WishlistItemRead(
                id=wishlist_item.id,
                product_id=product.id,
                product_name=product.name,
                product_price=product.price,
                product_image_url=product.image_url,
                created_at=wishlist_item.created_at,
            )
        )
    return items


def delete_wishlist_item(session: Session, user_id: int, product_id: int) -> bool:
    wishlist_item = session.exec(
        select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
    ).first()
    if not wishlist_item:
        return False

    session.delete(wishlist_item)
    session.commit()
    return True


def create_review(
    session: Session, user_id: int, review_create: ReviewCreate
) -> ReviewRead:
    product = get_product_by_id(session, review_create.product_id)
    user = get_user_by_id(session, user_id)
    if not product or not user:
        raise ValueError("Product or user not found.")

    existing_review = session.exec(
        select(Review).where(
            Review.user_id == user_id,
            Review.product_id == review_create.product_id,
        )
    ).first()
    if existing_review:
        raise ValueError("You already reviewed this product.")

    review = Review.model_validate(review_create)
    review.user_id = user_id
    session.add(review)
    session.commit()
    session.refresh(review)
    return _build_review_read(session, review)


def update_review(
    session: Session,
    review_id: int,
    review_update: ReviewUpdate,
    current_user: User,
) -> Optional[ReviewRead]:
    review = _get_review_by_id(session, review_id)
    if not review:
        return None

    can_manage = current_user.role in {"admin", "super_admin"} or review.user_id == current_user.id
    if not can_manage:
        raise PermissionError("You can only edit your own review.")

    update_data = review_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)
    review.updated_at = datetime.utcnow()
    session.add(review)
    session.commit()
    session.refresh(review)
    return _build_review_read(session, review)


def delete_review(
    session: Session,
    review_id: int,
    current_user: User,
) -> bool:
    review = _get_review_by_id(session, review_id)
    if not review:
        return False

    can_manage = current_user.role in {"admin", "super_admin"} or review.user_id == current_user.id
    if not can_manage:
        raise PermissionError("You can only delete your own review.")

    session.delete(review)
    session.commit()
    return True


def update_user_role(
    session: Session, user_id: int, role_update: UserRoleUpdate
) -> Optional[User]:
    # Admin can change customer/admin role.
    user = get_user_by_id(session, user_id)
    if not user:
        return None

    user.role = role_update.role
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_user(session: Session, user_id: int) -> bool:
    # Delete user and their cart items.
    user = get_user_by_id(session, user_id)
    if not user:
        return False

    cart_items = session.exec(select(CartItem).where(CartItem.user_id == user_id)).all()
    for item in cart_items:
        session.delete(item)

    wishlist_items = session.exec(
        select(WishlistItem).where(WishlistItem.user_id == user_id)
    ).all()
    for item in wishlist_items:
        session.delete(item)

    reviews = session.exec(select(Review).where(Review.user_id == user_id)).all()
    for review in reviews:
        session.delete(review)

    cart_coupon = get_cart_coupon(session, user_id)
    if cart_coupon:
        session.delete(cart_coupon)

    coupons = session.exec(select(Coupon).where(Coupon.created_by == user_id)).all()
    for coupon in coupons:
        coupon.created_by = None
        session.add(coupon)

    session.delete(user)
    session.commit()
    return True


def seed_products(session: Session) -> None:
    existing_products = session.exec(select(Product)).first()
    if existing_products:
        return

    for product_data in SAMPLE_PRODUCTS:
        session.add(Product.model_validate(product_data))
    session.commit()


def get_product_by_id(session: Session, product_id: int) -> Optional[Product]:
    return session.get(Product, product_id)


def get_products(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> list[Product]:
    statement = select(Product)

    if search:
        # Search product name.
        statement = statement.where(Product.name.contains(search))

    statement = statement.offset(skip).limit(limit)
    return list(session.exec(statement).all())


def create_product(session: Session, product_create: ProductCreate) -> Product:
    product = Product.model_validate(product_create)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def update_product(
    session: Session, product_id: int, product_update: ProductUpdate
) -> Optional[Product]:
    product = get_product_by_id(session, product_id)
    if not product:
        return None

    update_data = product_update.model_dump(exclude_unset=True)
    if "stock" in update_data:
        # Stock cannot be less than items already in carts.
        cart_quantity = get_cart_quantity_for_product(session, product_id)
        if update_data["stock"] < cart_quantity:
            raise ValueError(
                f"Stock cannot be lower than the {cart_quantity} item(s) already in the cart."
            )

    for key, value in update_data.items():
        setattr(product, key, value)

    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def delete_product(session: Session, product_id: int) -> bool:
    product = get_product_by_id(session, product_id)
    if not product:
        return False

    cart_items = session.exec(
        select(CartItem).where(CartItem.product_id == product_id)
    ).all()
    for item in cart_items:
        session.delete(item)

    wishlist_items = session.exec(
        select(WishlistItem).where(WishlistItem.product_id == product_id)
    ).all()
    for item in wishlist_items:
        session.delete(item)

    reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
    for review in reviews:
        session.delete(review)

    order_items = session.exec(
        select(OrderItem).where(OrderItem.product_id == product_id)
    ).all()
    for item in order_items:
        # Keep old order history but remove the deleted product link.
        item.product_id = None
        session.add(item)

    session.delete(product)
    session.commit()
    return True


def get_cart_item_by_id(session: Session, cart_item_id: int) -> Optional[CartItem]:
    return session.get(CartItem, cart_item_id)


def get_cart_quantity_for_product(session: Session, product_id: int) -> int:
    cart_items = session.exec(
        select(CartItem).where(CartItem.product_id == product_id)
    ).all()
    return sum(item.quantity for item in cart_items)


def _build_cart_item_read(session: Session, cart_item: CartItem) -> CartItemRead:
    # Add product info for cart display.
    product = get_product_by_id(session, cart_item.product_id)
    if not product:
        raise ValueError("Product not found for cart item")

    return CartItemRead(
        id=cart_item.id,
        product_id=product.id,
        product_name=product.name,
        unit_price=product.price,
        quantity=cart_item.quantity,
        stock=product.stock,
        subtotal=round(product.price * cart_item.quantity, 2),
    )


def get_cart_items(session: Session, user_id: int) -> list[CartItemRead]:
    cart_items = session.exec(select(CartItem).where(CartItem.user_id == user_id)).all()
    return [_build_cart_item_read(session, item) for item in cart_items]


def get_all_user_carts(session: Session) -> list[AdminUserCartRead]:
    # Admin dashboard only shows customers.
    users = session.exec(
        select(User).where(User.role == "customer").order_by(User.username)
    ).all()
    user_carts: list[AdminUserCartRead] = []

    for user in users:
        items = get_cart_items(session, user.id)
        user_carts.append(
            AdminUserCartRead(
                user=UserRead.model_validate(user),
                items=items,
                total_items=sum(item.quantity for item in items),
                total_price=round(sum(item.subtotal for item in items), 2),
            )
        )

    return user_carts


def add_to_cart(
    session: Session, user_id: int, cart_item_create: CartItemCreate
) -> Optional[CartItemRead]:
    product = get_product_by_id(session, cart_item_create.product_id)
    if not product:
        return None

    if product.stock == 0:
        raise ValueError("This product is out of stock.")

    existing_item = session.exec(
        select(CartItem).where(
            CartItem.user_id == user_id,
            CartItem.product_id == cart_item_create.product_id,
        )
    ).first()

    if existing_item:
        # Same product increases quantity.
        requested_quantity = existing_item.quantity + cart_item_create.quantity
        if requested_quantity > product.stock:
            raise ValueError(
                f"Only {product.stock} item(s) are available for {product.name}."
            )

        existing_item.quantity = requested_quantity
        session.add(existing_item)
        session.commit()
        session.refresh(existing_item)
        return _build_cart_item_read(session, existing_item)

    if cart_item_create.quantity > product.stock:
        raise ValueError(
            f"Only {product.stock} item(s) are available for {product.name}."
        )

    cart_item = CartItem.model_validate(cart_item_create)
    cart_item.user_id = user_id
    session.add(cart_item)
    session.commit()
    session.refresh(cart_item)
    return _build_cart_item_read(session, cart_item)


def update_cart_item(
    session: Session,
    user_id: int,
    cart_item_id: int,
    cart_item_update: CartItemUpdate,
) -> Optional[CartItemRead]:
    cart_item = get_cart_item_by_id(session, cart_item_id)
    if not cart_item or cart_item.user_id != user_id:
        return None

    product = get_product_by_id(session, cart_item.product_id)
    if not product:
        raise ValueError("Product not found for cart item")

    if cart_item_update.quantity > product.stock:
        raise ValueError(
            f"Only {product.stock} item(s) are available for {product.name}."
        )

    cart_item.quantity = cart_item_update.quantity
    session.add(cart_item)
    session.commit()
    session.refresh(cart_item)
    return _build_cart_item_read(session, cart_item)


def delete_cart_item(session: Session, user_id: int, cart_item_id: int) -> bool:
    cart_item = get_cart_item_by_id(session, cart_item_id)
    if not cart_item or cart_item.user_id != user_id:
        return False

    session.delete(cart_item)
    session.commit()
    return True
