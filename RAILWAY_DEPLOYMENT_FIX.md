# 🚀 Railway 404 Error Fix

## 🔍 Problem Identified
Your Scribsy app is getting 404 errors on Railway because:

1. **Missing Environment Variables** - Railway needs specific env vars to start the app
2. **Database Configuration** - App needs PostgreSQL on Railway (not SQLite)
3. **Database Initialization** - Tables aren't being created during deployment

## ✅ Solution Applied

I've fixed the following in your codebase:

### 1. **Fixed Railway Configuration** (`railway.json`)
- Moved database initialization to startup command
- Fixed Unicode encoding issues in `init_db.py`
- Added PostgreSQL support in database configuration

### 2. **Updated Dependencies** (`requirements.txt`)
- Added `psycopg2-binary>=2.9.5` for PostgreSQL support

### 3. **Fixed Database Engine** (`app/db/database.py`)
- Now handles both SQLite (local) and PostgreSQL (Railway) properly

## 🛠️ **Next Steps - You Need to Do These in Railway:**

### Step 1: Add PostgreSQL Database
1. Go to your Railway project dashboard
2. Click "New" → "Database" → "PostgreSQL"
3. Wait for it to provision (takes 1-2 minutes)

### Step 2: Set Environment Variables
Go to your **backend service** → "Variables" tab and add these:

#### **Required Variables:**
```bash
# Database (copy from PostgreSQL service)
DATABASE_URL=postgresql://postgres:password@...

# Security (generate a random 32-character string)
SECRET_KEY=your-random-32-character-secret-key-here

# OpenAI API (your actual API key)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### **Optional But Recommended:**
```bash
DEBUG=false
HOST=0.0.0.0
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
UPLOAD_DIR=uploads
MAX_AUDIO_FILE_SIZE=50
LOG_LEVEL=INFO
WHISPER_MODEL=base
USE_S3=false
```

### Step 3: Deploy
Railway will automatically redeploy once you add the variables.

## 🔧 **How to Get the Database URL:**

### Method 1 (Easiest):
1. In Railway, go to your PostgreSQL database service
2. Click "Connect"
3. Copy the "Database URL" 
4. Paste it as `DATABASE_URL` in your backend service variables

### Method 2:
1. In your PostgreSQL service, go to "Variables" tab
2. Copy the individual values:
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
3. Construct URL: `postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE`

## 🎯 **Expected Result:**

After setting these variables:
- ✅ Railway deployment succeeds
- ✅ Healthcheck passes on `/` endpoint  
- ✅ Your API is accessible
- ✅ Database tables are created automatically
- ✅ 404 error is resolved

## 🚨 **Important Notes:**

1. **SECRET_KEY** must be a random 32+ character string
2. **DATABASE_URL** must be from your Railway PostgreSQL service
3. **OPENAI_API_KEY** is required for AI features (get from OpenAI dashboard)

## 🧪 **Testing After Deployment:**

Once deployed, test these URLs (replace with your Railway URL):
- `https://your-app.railway.app/` - Should return welcome message
- `https://your-app.railway.app/docs` - Should show API documentation
- `https://your-app.railway.app/status` - Should show service status

## ❓ **Still Getting 404?**

Check Railway logs:
1. Go to your backend service
2. Click "Deployments" tab  
3. Click latest deployment
4. Check logs for specific error messages

Common issues:
- Missing `DATABASE_URL` → App can't connect to database
- Invalid `SECRET_KEY` → App won't start in production
- Missing `OPENAI_API_KEY` → App starts but AI features fail

---

**The code fixes are complete. Now you just need to configure Railway with the environment variables above!**