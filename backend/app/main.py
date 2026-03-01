from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.transactions import router as transactions_router
from app.api.persons import router as persons_router
from app.api.debts import router as debts_router
from app.api.categories import router as categories_router
from app.api.dashboard import router as dashboard_router
from app.api.accounts import router as accounts_router
from app.api.monthly_summaries import router as monthly_summaries_router
from app.api.users import router as users_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Personal Finance API",
    version="1.0.0"
)

# Extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(persons_router, prefix="/api/persons", tags=["Persons"])
app.include_router(debts_router, prefix="/api/debts", tags=["Debts"])
app.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(monthly_summaries_router, prefix="/api/monthly-summaries", tags=["Monthly Summaries"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])

@app.get("/api/health")
def health_check():
    return {"status": "ok", "env": settings.ENV}
