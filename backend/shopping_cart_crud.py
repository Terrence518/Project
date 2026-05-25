import os
from datetime import datetime, timedelta
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
