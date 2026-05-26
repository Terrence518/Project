# St Leonards' Tech Store

St Leonards' Tech Store is a single-page e-commerce shopping cart web app. This project extends the Assignment 1 store into an Assignment 2 full-stack app with login, user roles, customer carts, wishlist, reviews, coupons, checkout, and admin tools.

## Technical Stack

- Frontend: React with Vite
- Styling: custom CSS in `frontend/assignment1/src/App.css` and `frontend/assignment1/src/index.css`
- Backend: FastAPI with SQLModel
- Database: MySQL
- Authentication: password hashing with bcrypt and JWT tokens
- App type: single-page application with one React entry point

## Main Features

- User registration and login
- Password hashing for stored passwords
- JWT-based authentication
- Customer, admin, and super admin roles
- Product listing loaded from MySQL
- Live product search by name
- Customer-only shopping cart
- User-specific cart data
- Add, update, and remove cart items
- Customer wishlist
- Product reviews and ratings
- Coupon discounts
- Mock checkout and payment
- Customer order history
- Stock validation so users cannot add more than the available stock
- Admin-only product creation, editing, and deletion
- Admin dashboard for viewing all customer carts
- Admin coupon management
- Admin order management
- Super admin user management for changing roles and deleting users
- Responsive single-page layout

## User Roles

### Customer

Customers can:

- Register and log in
- Browse and search products
- Add products to their own cart
- Update cart quantities
- Remove cart items
- Save products to wishlist
- Add product reviews
- Apply coupons
- Checkout with mock payment
- View order history
- Log out

Customers cannot:

- Create products
- Edit product stock/details
- Delete products
- View other users' carts

### Admin

Admins can:

- Log in
- View all products
- Create, edit, and delete products
- View all customer carts in the admin dashboard
- Manage coupons
- View customer orders
- Update order status

Admins do not use the customer shopping cart interface.

### Super Admin

The super admin is the owner account for user management.

Super admins can:

- Do everything an admin can do
- View all user accounts
- Change users between `customer` and `admin`
- Delete user accounts

Super admins cannot:

- Change or delete their own super admin account
- Create another super admin from the website

The first super admin is set manually in MySQL.

## Folder Structure

- `backend/`: FastAPI server, database models, login, and CRUD logic
- `backend/main.py`: backend entry file used by Uvicorn
- `backend/shopping_cart_app.py`: API routes, CORS, login checks, and route protection
- `backend/shopping_cart_crud.py`: SQLModel models, database setup, auth helpers, products, carts, and admin queries
- `backend/database_setup.sql`: creates the MySQL database
- `backend/requirements.txt`: Python backend dependencies
- `frontend/assignment1/`: React frontend application
- `frontend/assignment1/src/App.jsx`: main page state, API calls, login flow, and role-based rendering
- `frontend/assignment1/src/components/`: UI components for auth, products, cart, inventory, and admin dashboard
- `frontend/assignment1/src/App.css`: page-specific styling
- `frontend/assignment1/src/index.css`: global styling

## Backend API Summary

Authentication:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Products:

- `GET /products`
- `GET /products/{product_id}`
- `POST /products` admin only
- `PUT /products/{product_id}` admin only
- `DELETE /products/{product_id}` admin only

Customer cart:

- `GET /cart`
- `GET /cart/summary`
- `POST /cart/items`
- `PUT /cart/items/{cart_item_id}`
- `DELETE /cart/items/{cart_item_id}`
- `POST /cart/apply-coupon`

Wishlist:

- `GET /wishlist`
- `POST /wishlist/{product_id}`
- `DELETE /wishlist/{product_id}`

Reviews:

- `GET /products/{product_id}/reviews`
- `POST /products/{product_id}/reviews`
- `PUT /reviews/{review_id}`
- `DELETE /reviews/{review_id}`

Coupons:

- `GET /coupons`

Admin and super admin:

- `GET /admin/carts`
- `GET /admin/coupons`
- `POST /admin/coupons`
- `PUT /admin/coupons/{coupon_id}`
- `DELETE /admin/coupons/{coupon_id}`
- `GET /admin/orders`
- `PUT /admin/orders/{order_id}/status`

Checkout and orders:

- `POST /checkout`
- `GET /orders`

Super admin only:

- `GET /admin/users`
- `PUT /admin/users/{user_id}/role`
- `DELETE /admin/users/{user_id}`

## Running The Project

1. Start MySQL.

2. Create the database if it does not already exist:

```sql
CREATE DATABASE IF NOT EXISTS ass1db;
```

3. In `backend/.env`, set your MySQL connection details. Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ass1db
DB_USER=root
DB_PASSWORD=your_mysql_password
SECRET_KEY=change-this-secret-key
```

4. Create and prepare the backend Python virtual environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

5. Start the backend:

```powershell
python -m uvicorn main:app
```

The backend usually runs at:

```text
http://127.0.0.1:8000
```

FastAPI documentation is available at:

```text
http://127.0.0.1:8000/docs
```

6. Install frontend dependencies and start the frontend in a second terminal:

```powershell
cd frontend\assignment1
npm install
npm.cmd run dev
```

7. Open the frontend in the browser:

```text
http://127.0.0.1:5173
```

## Testing Customer Login

1. Open the website.
2. Register a new account.
3. Log in as that user.
4. Add products to the cart.
5. Log out and log back in.
6. The cart should still belong to that user.

## Testing Checkout

1. Log in as a customer.
2. Add products to the cart.
3. Open the cart.
4. Optional: apply a valid coupon.
5. Fill in the checkout form.
6. Click `Pay and place order`.
7. The cart should clear and the order should appear in order history.

This is a mock payment flow for the assignment. Card details are checked by simple validation but are not saved in the database.

## Making A User An Admin

New registered users are customers by default. To test the admin dashboard, update one user in MySQL:

```sql
USE ass1db;

UPDATE users
SET role = 'admin'
WHERE username = 'terry';

SELECT id, username, email, role
FROM users;
```

Replace `terry` with your registered username.

After running the SQL:

1. Log out from the website.
2. Log in again.
3. The admin dashboard and inventory manager should appear.

To change the user back to customer:

```sql
USE ass1db;

UPDATE users
SET role = 'customer'
WHERE username = 'terry';
```

## Making A User A Super Admin

Super admin is used for user management. This role is not created from the website because there should only be one owner account.

To make one user the super admin:

```sql
USE ass1db;

UPDATE users
SET role = 'super_admin'
WHERE username = 'terry';

SELECT id, username, email, role
FROM users;
```

After running the SQL, log out and log in again. The user management panel should appear for the super admin.

## Workload Allocation

Person 1:

- Added backend dependencies
- Added user database model
- Added password hashing
- Added JWT token authentication
- Added register, login, and current-user API routes
- Connected frontend login and register state
- Added basic customer/admin role rendering
- Added wishlist, reviews, coupons, and related UI updates
- Updated README documentation

Person 2:

- Added admin user management schemas and backend helpers
- Added protected super admin user management API routes
- Added frontend user management panel
- Connected role update and user delete actions
- Added super admin role rules
- Improved user management styling
- Added order and checkout database models
- Added checkout backend helper functions and API routes
- Added customer checkout panel
- Added customer order history
- Added admin order management panel
- Fixed product deletion when old order history exists
- Added coupon expiry date validation
- Updated README documentation

## Notes

- The frontend stores the JWT token in `localStorage` so the user stays logged in after refreshing.
- Product create, update, and delete operations are protected on the backend, not only hidden in the frontend.
- Customer cart records include `user_id`, so each customer has a separate cart.
- The admin dashboard shows customer carts only, not admin accounts.
- User management is only shown to the super admin.
- Normal admins can manage products and view customer carts, but cannot manage user accounts.
- Product images use direct image URLs, for example links that end in `.jpg`, `.jpeg`, `.png`, or `.webp`.
- Checkout uses mock payment only. It does not process real card payments.
- Old order history is kept even if an admin later deletes a product.
