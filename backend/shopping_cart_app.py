from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from shopping_cart_crud import (
    AdminUserCartRead,
    AdminUserRead,
    CartItemCreate,
    CartItemRead,
    CartItemUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    Token,
    User,
    UserCreate,
    UserLogin,
    UserRead,
    UserRoleUpdate,
    add_to_cart,
    authenticate_user,
    create_login_token,
    create_product,
    create_user,
    delete_cart_item,
    delete_product,
    delete_user,
    get_all_user_carts,
    get_admin_users,
    get_cart_items,
    get_product_by_id,
    get_products,
    get_session,
    get_user_from_token,
    initialize_database,
    update_cart_item,
    update_product,
    update_user_role,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Setup database when API starts.
    initialize_database()
    yield


app = FastAPI(
    title="Shopping Cart API",
    description="Backend API for a single-page e-commerce shopping cart application.",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_session),
) -> User:
    # Check if token is valid.
    user = get_user_from_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    # Check if user can use admin features.
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )
    return current_user


def get_current_super_admin(current_user: User = Depends(get_current_user)) -> User:
    # Only super admin can manage other users.
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access is required",
        )
    return current_user


@app.get("/")
def read_root():
    return {
        "message": "Shopping Cart API is running",
        "docs": "/docs",
        "products": "/products",
        "cart": "/cart",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_session)):
    # Make a new customer account.
    try:
        return create_user(db, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_session)):
    # Login and return token.
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return create_login_token(user)


@app.get("/auth/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/admin/users", response_model=list[AdminUserRead])
def read_admin_users(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_super_admin),
):
    # Super admin can view all users with cart totals.
    return get_admin_users(db)


@app.put("/admin/users/{user_id}/role", response_model=UserRead)
def edit_admin_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_super_admin),
):
    # Do not let a super admin remove their own owner access.
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own super admin role.",
        )

    updated_user = update_user_role(db, user_id, role_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@app.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_admin_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_super_admin),
):
    # Do not let a super admin delete their own account.
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own super admin account.",
        )

    deleted = delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/admin/carts", response_model=list[AdminUserCartRead])
def read_admin_carts(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    # Admin can see customer carts.
    return get_all_user_carts(db)


@app.get("/products", response_model=list[ProductRead])
def read_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_session),
):
    return get_products(db, skip=skip, limit=limit, search=search)


@app.get("/products/{product_id}", response_model=ProductRead)
def read_product(product_id: int, db: Session = Depends(get_session)):
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def add_product(
    product: ProductCreate,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    # Only admin can add products.
    return create_product(db, product)


@app.put("/products/{product_id}", response_model=ProductRead)
def edit_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    try:
        updated_product = update_product(db, product_id, product)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated_product


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(
    product_id: int,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    deleted = delete_product(db, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/cart", response_model=list[CartItemRead])
def read_cart(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Return this user's cart only.
    return get_cart_items(db, current_user.id)


@app.post(
    "/cart/items", response_model=CartItemRead, status_code=status.HTTP_201_CREATED
)
def create_cart_item(
    cart_item: CartItemCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        new_item = add_to_cart(db, current_user.id, cart_item)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not new_item:
        raise HTTPException(status_code=404, detail="Product not found")
    return new_item


@app.put("/cart/items/{cart_item_id}", response_model=CartItemRead)
def edit_cart_item(
    cart_item_id: int,
    cart_item: CartItemUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_item = update_cart_item(db, current_user.id, cart_item_id, cart_item)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return updated_item


@app.delete("/cart/items/{cart_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    cart_item_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_cart_item(db, current_user.id, cart_item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
