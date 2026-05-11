import os
from datetime import datetime
from pathlib import Path
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import or_
from sqlmodel import Field, Session, SQLModel, create_engine, select

load_dotenv(Path(__file__).resolve().parent / ".env")


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "ass1db")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=False)


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


class CartItemBase(SQLModel):
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1, ge=1)


class CartItem(CartItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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
    with Session(engine) as session:
        seed_products(session)


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
        statement = statement.where(
            or_(
                Product.name.contains(search),
                Product.description.contains(search),
            )
        )

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


def get_cart_items(session: Session) -> list[CartItemRead]:
    cart_items = session.exec(select(CartItem)).all()
    return [_build_cart_item_read(session, item) for item in cart_items]


def add_to_cart(
    session: Session, cart_item_create: CartItemCreate
) -> Optional[CartItemRead]:
    product = get_product_by_id(session, cart_item_create.product_id)
    if not product:
        return None

    if product.stock == 0:
        raise ValueError("This product is out of stock.")

    existing_item = session.exec(
        select(CartItem).where(CartItem.product_id == cart_item_create.product_id)
    ).first()

    if existing_item:
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
    session.add(cart_item)
    session.commit()
    session.refresh(cart_item)
    return _build_cart_item_read(session, cart_item)


def update_cart_item(
    session: Session, cart_item_id: int, cart_item_update: CartItemUpdate
) -> Optional[CartItemRead]:
    cart_item = get_cart_item_by_id(session, cart_item_id)
    if not cart_item:
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


def delete_cart_item(session: Session, cart_item_id: int) -> bool:
    cart_item = get_cart_item_by_id(session, cart_item_id)
    if not cart_item:
        return False

    session.delete(cart_item)
    session.commit()
    return True
