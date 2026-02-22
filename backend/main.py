from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import create_db_and_tables
from .seed import seed
from .routers import accounts, contributions, summary, values


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    seed()
    yield


app = FastAPI(title="Budget App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Personal LAN app — open to all local network origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(values.router)
app.include_router(contributions.router)
app.include_router(summary.router)
