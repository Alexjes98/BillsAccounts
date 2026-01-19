# Backend - Personal Finance App

This is the Flask backend for the Personal Finance Application.

## Setup

1. **Create Virtual Environment & Install Dependencies**
   You can use the provided setup script:

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   Or manually:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**
   Create a `.env` file in this directory (see `app/core/config.py` for variables).

## Running the App

```bash
source venv/bin/activate
export FLASK_APP=app
export FLASK_ENV=development
flask run --port 5001
```

## Testing

```bash
pytest
```
