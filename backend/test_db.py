from database import SessionLocal, Database, Base

print("Imported SessionLocal, Database, and Base successfully")
db = Database()
db.connect()
print("Connection test complete")
