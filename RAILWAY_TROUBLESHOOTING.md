# 🚨 Railway Healthcheck Failed - Troubleshooting Guide

Your Railway deployment failed healthcheck because the app isn't starting properly. Here's how to debug and fix it:

## 🔍 **What I Fixed in the Code:**

### 1. **Improved Railway Configuration** (`railway.json`)
- Added better error handling for database initialization
- Created dedicated startup script with detailed logging

### 2. **Enhanced Database Initialization** (`init_db.py`)
- Added proper error handling and logging
- Made it non-fatal if database setup fails
- Better debugging output

### 3. **Created Startup Script** (`start_railway.sh`)
- Tests database connection before starting
- Provides detailed logging
- Graceful error handling

## 🛠️ **What You Need to Check in Railway:**

### **Step 1: Check Environment Variables**
In your **Scribsy service** → **Variables** tab, ensure you have:

```bash
# CRITICAL - These MUST be set
DATABASE_URL=postgresql://postgres:password@host:port/database
SECRET_KEY=your-random-32-character-secret-key
OPENAI_API_KEY=sk-your-openai-key

# RECOMMENDED
DEBUG=false
HOST=0.0.0.0
PORT=8000  # Railway usually sets this automatically
```

### **Step 2: Check Railway Logs**
1. Go to your **Scribsy service**
2. Click **"Deployments"** tab
3. Click the **latest deployment**
4. Check **"Deploy Logs"** for errors

Look for these error patterns:
- `Database connection failed`
- `ModuleNotFoundError`
- `Environment variable not set`
- `Port already in use`

### **Step 3: Verify PostgreSQL Database**
1. Make sure you have a **PostgreSQL service** in your Railway project
2. Go to PostgreSQL service → **"Connect"** tab
3. Copy the **Database URL**
4. Paste it as `DATABASE_URL` in your Scribsy service variables

## 🔧 **Common Issues & Solutions:**

### **Issue 1: Missing DATABASE_URL**
**Symptoms:** App fails to start, database connection errors
**Solution:** 
1. Add PostgreSQL database to Railway project
2. Set `DATABASE_URL` variable in Scribsy service

### **Issue 2: Weak SECRET_KEY**
**Symptoms:** App won't start in production mode
**Solution:** Generate a strong secret key:
```bash
# Use this command locally to generate:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### **Issue 3: Missing OPENAI_API_KEY**
**Symptoms:** App might start but AI features fail
**Solution:** Get API key from OpenAI dashboard and set variable

### **Issue 4: Port Configuration**
**Symptoms:** App starts but healthcheck fails
**Solution:** Railway automatically sets `PORT` - don't override it

### **Issue 5: Build Dependencies**
**Symptoms:** Build fails, missing packages
**Solution:** Check `requirements.txt` has all dependencies

## 📋 **Step-by-Step Debugging:**

### **1. Check Variables First**
```bash
# Required variables:
DATABASE_URL=postgresql://...
SECRET_KEY=random-string-32-chars
OPENAI_API_KEY=sk-...
```

### **2. Check Railway Logs**
Look for specific error messages:
- Database connection errors
- Missing environment variables
- Import errors
- Port binding issues

### **3. Test Database Connection**
In Railway PostgreSQL service:
- Go to "Data" tab
- See if you can connect to the database
- Check if tables are being created

## 🚀 **Expected Success Indicators:**

After fixing the issues, you should see:
```
✓ Database connection successful
✓ Database tables created/verified  
✓ Test user created successfully!
✓ Uvicorn server starting...
✓ Application startup complete
✓ Healthcheck passed
```

## 🆘 **If Still Not Working:**

1. **Share Railway Logs**: Copy the exact error messages from deployment logs
2. **Check Variable Names**: Make sure variable names match exactly
3. **Verify Database Status**: Ensure PostgreSQL service is running
4. **Test Locally**: Try running `python init_db.py` locally to test

---

**The code is now more robust and should handle Railway deployment better. The issue is likely environment variables configuration in Railway.**