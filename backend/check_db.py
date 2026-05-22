import asyncio
from app.database import SessionLocal
from app.models import Game
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        games = await db.scalars(select(Game))
        for g in games:
            print(f"Game {g.id}: status={g.status}, error={g.analysis_error}")

if __name__ == "__main__":
    asyncio.run(main())
