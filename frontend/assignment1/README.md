# St Leonards' Tech Store

St Leonards' Tech Store is a single-page e-commerce shopping cart website. The website solves the problem of browsing tech accessories and managing purchases in one place by letting users view products, search products, add items to a cart, update quantities, and remove items without leaving the page.

## Technical Stack

- Frontend: React with Vite
- Styling: custom CSS in `frontend/assignment1/src/App.css` and `frontend/assignment1/src/index.css`
- Routing: single-page interface with one React entry point; the page updates dynamically without full page reloads
- Data/API: Fetch API calling a FastAPI backend
- Backend: FastAPI with SQLModel
- Database: MySQL
- Deployment: local development setup for this assignment; no cloud deployment configured

## Features

- Single-page storefront and shopping cart experience
- Product listing loaded from MySQL
- Search bar for filtering products by name or description
- Add to cart, update quantity, and remove from cart
- Product CRUD form for creating, editing, and deleting products
- Stock validation to stop cart quantities from exceeding available stock
- Responsive layout for desktop and smaller screens

## Folder Structure

- `backend/`: FastAPI server, MySQL connection, models, and CRUD logic
- `backend/main.py`: backend entry file used by Uvicorn
- `backend/shopping_cart_app.py`: API routes and FastAPI setup
- `backend/shopping_cart_crud.py`: database models, stock rules, seed data, and CRUD functions
- `frontend/assignment1/`: React frontend application
- `frontend/assignment1/src/App.jsx`: main page coordinator and shared state
- `frontend/assignment1/src/components/`: split UI components for product catalog, cart, and inventory management
- `frontend/assignment1/src/App.css`: page-specific styling
- `frontend/assignment1/src/index.css`: global styling

## Challenges Overcome

One challenge was connecting the React frontend, FastAPI backend, and MySQL database so data could flow correctly between all parts of the project. Another challenge was turning the default Vite starter into a real storefront interface with product cards, cart controls, and product management features. Search was added through both the backend and frontend so the page feels more dynamic and useful. Stock control was also improved so users cannot add more items to the cart than are available in inventory. Finally, the interface was refined to feel cleaner and more streamlined by simplifying labels, improving button states, and keeping everything on a single page.

## Running The Project

1. Start MySQL and make sure the `ass1db` database exists.
2. In `backend/.env`, set your MySQL username and password.
3. Start the backend:

cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app

4. Start the frontend:

cd frontend\assignment1
npm.cmd run dev

5. Open the frontend in the browser, usually at `http://127.0.0.1:5173`.
