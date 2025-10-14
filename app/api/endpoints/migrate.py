"""
Migration endpoint for database schema updates
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import os
from app.db.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/migrate-database")
async def migrate_database(db: Session = Depends(get_db)):
    """
    Run database migration to add missing columns.
    This endpoint should only be called once to fix the schema.
    """
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
        
        # Create engine for direct SQL execution
        engine = create_engine(database_url)
        
        # SQL commands to add missing columns
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'provider';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS work_start_time VARCHAR DEFAULT '09:00';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS work_end_time VARCHAR DEFAULT '17:00';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'UTC';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS working_days VARCHAR DEFAULT '1,2,3,4,5';",
        ]
        
        results = []
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                for i, migration in enumerate(migrations, 1):
                    try:
                        conn.execute(text(migration))
                        results.append(f"Migration {i}: Success")
                    except OperationalError as e:
                        if "already exists" in str(e).lower():
                            results.append(f"Migration {i}: Column already exists")
                        else:
                            results.append(f"Migration {i}: Error - {str(e)}")
                            raise e
                
                trans.commit()
                
            except Exception as e:
                trans.rollback()
                raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
        
        return {
            "success": True,
            "message": "Database migration completed",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration error: {str(e)}")

@router.post("/fix-database")
async def fix_database():
    """
    Simple endpoint to fix the database schema.
    This runs the fix_database.py script.
    """
    try:
        import subprocess
        import sys
        
        # Run the fix script
        result = subprocess.run([sys.executable, "fix_database.py"], 
                              capture_output=True, text=True, cwd="/app")
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Database fix completed",
                "output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Database fix failed",
                "error": result.stderr
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fix error: {str(e)}")

@router.post("/simple-fix")
async def simple_fix():
    """
    Simple database fix - recreates the users table with correct structure.
    This should resolve the 500 errors on auth endpoints.
    """
    try:
        import subprocess
        import sys
        
        # Run the simple fix script
        result = subprocess.run([sys.executable, "simple_fix.py"], 
                              capture_output=True, text=True, cwd="/app")
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Database simple fix completed",
                "output": result.stdout,
                "test_credentials": {
                    "username": "testuser",
                    "password": "testpass123"
                }
            }
        else:
            return {
                "success": False,
                "message": "Database simple fix failed",
                "error": result.stderr
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simple fix error: {str(e)}")

@router.post("/fix-railway-db")
async def fix_railway_database():
    """Fix Railway database schema by adding missing columns"""
    try:
        # Import and run the fix script
        import subprocess
        import os
        
        # Set environment variables
        env = os.environ.copy()
        env["DATABASE_URL"] .database_url
        
        # Run the fix script
        result = subprocess.run(
            ["python", "fix_railway_db.py"],
            capture_output=True,
            text=True,
            env=env,
            cwd="/app"  # Railway app directory
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Railway database fix completed successfully",
                "output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Railway database fix failed",
                "error": result.stderr,
                "output": result.stdout
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Railway DB fix error: {str(e)}")
