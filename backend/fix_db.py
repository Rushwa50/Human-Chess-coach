import asyncio
import random
from sqlalchemy import select, update
from app.database import SessionLocal
from app.models import Game
from app.ai_explainer import FALLBACK_LESSONS

async def main():
    async with SessionLocal() as db:
        result = await db.scalars(select(Game).where(Game.loss_reason == "No summary available."))
        games = result.all()
        for game in games:
            game.loss_reason = random.choice(FALLBACK_LESSONS)
            game.lesson_status = "new"
        await db.commit()
        print(f"Updated {len(games)} games.")

if __name__ == "__main__":
    asyncio.run(main())
