import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "chess_coach.db")

def upgrade_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE games ADD COLUMN lesson_status VARCHAR(32);")
        print("Added lesson_status column.")
    except sqlite3.OperationalError as e:
        print(f"Skipped lesson_status: {e}")
        
    try:
        cursor.execute("ALTER TABLE games ADD COLUMN lesson_repetition INTEGER DEFAULT 1;")
        print("Added lesson_repetition column.")
    except sqlite3.OperationalError as e:
        print(f"Skipped lesson_repetition: {e}")
        
    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_db()
