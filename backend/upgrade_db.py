import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "chess_coach.db")

def upgrade_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("opening_suggestion", "TEXT"),
        ("loss_reason", "TEXT"),
        ("training_recommendation", "TEXT"),
        ("progress_summary", "TEXT"),
        ("game_story", "TEXT"),
        ("lesson_status", "VARCHAR(32)"),
        ("lesson_repetition", "INTEGER DEFAULT 1")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE games ADD COLUMN {col_name} {col_type};")
            print(f"Added {col_name} column.")
        except sqlite3.OperationalError as e:
            print(f"Skipped {col_name}: {e}")
        
    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_db()
