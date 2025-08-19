# 🚀 Railway Environment Variables Setup

## 🔍 **Why Healthcheck is Failing**

Your backend is deployed but failing healthcheck because it's missing required environment variables. Here's how to fix it:

## 📋 **Required Environment Variables in Railway**

Go to your Railway project → Variables tab and add these:

### **1. Database Configuration**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```
**Important**: You can't use SQLite in production. Railway provides PostgreSQL.

### **2. Security Configuration**
```bash
SECRET_KEY=your-super-secure-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### **3. OpenAI Configuration**
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

### **4. Server Configuration**
```bash
DEBUG=false
HOST=0.0.0.0
PORT=8000
```

### **5. S3 Configuration (Optional for now)**
```bash
USE_S3=false
S3_BUCKET_NAME=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION_NAME=us-east-1
```

### **6. Other Configuration**
```bash
UPLOAD_DIR=uploads
MAX_AUDIO_FILE_SIZE=50
LOG_LEVEL=INFO
WHISPER_MODEL=base
```

## 🗄️ **Setting Up PostgreSQL Database**

### **Option 1: Railway PostgreSQL (Recommended)**
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`
4. Copy the connection string to your backend service

### **Option 2: External Database**
- **Supabase** (free tier available)
- **PlanetScale** (free tier available)
- **Neon** (free tier available)

## 🔧 **Step-by-Step Fix**

### **Step 1: Add Database**
1. Go to Railway project
2. Click "New" → "Database" → "PostgreSQL"
3. Wait for it to provision

### **Step 2: Set Environment Variables**
1. Go to your backend service
2. Click "Variables" tab
3. Add all the variables listed above
4. Use the `DATABASE_URL` from your PostgreSQL service

### **Step 3: Redeploy**
1. Railway will automatically redeploy
2. Check the logs for any errors
3. Healthcheck should now pass

## 🚨 **Critical Variables (Must Set)**

```bash
# These are absolutely required:
DATABASE_URL=postgresql://...  # From Railway PostgreSQL
SECRET_KEY=random-string-32-chars-long
OPENAI_API_KEY=sk-...  # Your OpenAI key

# These are recommended:
DEBUG=false
HOST=0.0.0.0
```

## 📝 **Example Complete Setup**

```bash
# Database
DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway

# Security
SECRET_KEY=my-super-secret-key-32-characters-long-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here

# Server
DEBUG=false
HOST=0.0.0.0
PORT=8000

# S3 (disable for now)
USE_S3=false

# Other
UPLOAD_DIR=uploads
MAX_AUDIO_FILE_SIZE=50
LOG_LEVEL=INFO
WHISPER_MODEL=base
```

## 🔍 **Troubleshooting**

### **If Healthcheck Still Fails:**
1. Check Railway logs for specific errors
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check if application starts locally

### **Common Issues:**
- **Missing DATABASE_URL**: App can't connect to database
- **Weak SECRET_KEY**: App won't start in production mode
- **Missing OPENAI_API_KEY**: App will start but AI features won't work

## ✅ **Success Indicators**

After setting environment variables:
- ✅ Healthcheck passes
- ✅ Application logs show successful startup
- ✅ You can access your API endpoints
- ✅ Database connections work

---

**Need help?** Check the Railway logs for specific error messages after setting these variables.
