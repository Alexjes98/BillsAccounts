# AccountantApp

A full-stack personal finance application.

## Prerequisites

- **Docker:** For running the PostgreSQL database.
- **Python 3.10+:** For the backend API.
- **Node.js 16+:** For the frontend application.

## 1. Database Setup

We use Docker to run a local instance of PostgreSQL.

### Start the Database

Run the following command in the root directory:

```bash
docker-compose up -d
```

This starts a PostgreSQL container on **Port 5433**.

### Connection Details

- **Host:** `localhost`
- **Port:** `5433`
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `accountantapp`

### CLI Access

To access the database shell inside the container:

```bash
docker exec -it public_bc-db-1 psql -U postgres -d accountantapp
```

### Initialize Tables

To create the database tables:

```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
python backend/init_db.py
```

## 2. Backend Setup

The backend is built with FastAPI.

### Installation

Navigate to the backend directory and install dependencies:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Server

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## 3. Frontend Setup

The frontend is built with React and Vite.

### Installation

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

### Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.
