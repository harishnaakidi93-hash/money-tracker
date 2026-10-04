# Daybook

A tiny personal money tracker with a React frontend, Flask API, and PostgreSQL database.

## Run locally

Install and start PostgreSQL on your machine. Set the username and password in `backend/.env` to match your local PostgreSQL account; the default connection uses `localhost:5432`. On startup, the API creates the `money_tracker` database and its table if they do not already exist. The PostgreSQL user must have permission to create databases. The committed `.env.example` files show the expected settings.

Start the API in a terminal:

   ```sh
   cd backend
   python -m venv .venv
   . .venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```

Start the frontend in another terminal:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

Open <http://localhost:5173>. The API runs at <http://localhost:5000> and creates its table on startup. Set `VITE_API_URL` in `frontend/.env` to change the backend API base URL.


