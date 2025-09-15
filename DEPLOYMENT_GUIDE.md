# 🚀 Scribsy Deployment Guide

This guide will walk you through deploying your Scribsy application to production.

## 📋 **Overview**

- **Frontend (Next.js)**: Deploy to Vercel
- **Backend (FastAPI)**: Deploy to Railway/Render/DigitalOcean
- **Database**: Use production database (PostgreSQL recommended)

## 🎯 **Step 1: Deploy Backend First**

### **Option A: Railway (Recommended)**

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** → "Deploy from GitHub repo"
3. **Connect your Scribsy repository**
4. **Set environment variables**:
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   SECRET_KEY=your-super-secure-secret-key
   OPENAI_API_KEY=your-openai-key
   USE_S3=true
   S3_BUCKET_NAME=your-s3-bucket
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_REGION_NAME=us-east-1
   ```
5. **Deploy** and get your backend URL

### **Option B: Render**

1. **Sign up** at [render.com](https://render.com)
2. **Create new Web Service**
3. **Connect your GitHub repo**
4. **Set build command**: `pip install -r requirements.txt`
5. **Set start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Set environment variables** (same as Railway)
7. **Deploy** and get your backend URL

### **Option C: DigitalOcean App Platform**

1. **Sign up** at [digitalocean.com](https://digitalocean.com)
2. **Create new app** → "Source: GitHub"
3. **Select your repository**
4. **Configure as Python app**
5. **Set environment variables**
6. **Deploy** and get your backend URL

## 🌐 **Step 2: Deploy Frontend to Vercel**

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Import your GitHub repository**
3. **Configure project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `scribsy-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. **Set environment variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```
5. **Deploy**

## 🗄️ **Step 3: Set Up Production Database**

### **Option A: Railway PostgreSQL**
- Railway provides managed PostgreSQL
- Automatically sets `DATABASE_URL`

### **Option B: Supabase (Free tier)**
1. **Sign up** at [supabase.com](https://supabase.com)
2. **Create new project**
3. **Get connection string**
4. **Update backend environment variables**

### **Option C: PlanetScale**
1. **Sign up** at [planetscale.com](https://planetscale.com)
2. **Create new database**
3. **Get connection string**
4. **Update backend environment variables**

## 🔧 **Step 4: Update Environment Variables for Production**

### **Backend Environment Variables (Railway/Render)**
⚠️ **CRITICAL**: Before deploying to production, update these settings:

```bash
# Security Settings (REQUIRED for production)
DEBUG=False                    # ⚠️ MUST be False in production
SECRET_KEY=your-super-secure-secret-key-here
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Database
DATABASE_URL=your-production-database-url

# Other settings
ENVIRONMENT=production
```

### **Frontend Environment Variables (Vercel)**
1. **Go to Vercel dashboard**
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add/Update**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-actual-backend-url.com
   ```
5. **Redeploy** the frontend

## 🚀 **Step 5: Test Your Deployment**

### **Pre-Deployment Checklist**
- [ ] `DEBUG=False` in production environment
- [ ] Strong `SECRET_KEY` set
- [ ] `ALLOWED_ORIGINS` configured for your frontend domain
- [ ] Production database URL configured
- [ ] Frontend API URL points to production backend

### **Post-Deployment Testing**
1. **Test backend endpoints**:
   ```bash
   curl https://your-backend-url.com/
   curl https://your-backend-url.com/docs
   ```

2. **Test frontend**:
   - Visit your Vercel URL
   - Try to register/login
   - Test core functionality
   - Verify rate limiting works (should be 10 requests/second in production)

## 📱 **Step 6: Set Up Custom Domain (Optional)**

### **Backend Domain**
- Railway: Custom domains available
- Render: Custom domains available
- DigitalOcean: Custom domains available

### **Frontend Domain**
- Vercel: Easy custom domain setup
- Go to Project Settings → Domains
- Add your domain and configure DNS

## 🔒 **Step 7: Security & Performance**

### **Environment Variables**
- ✅ **Never commit secrets** to Git
- ✅ **Use strong SECRET_KEY**
- ✅ **Enable HTTPS everywhere**
- ✅ **Set up CORS properly**

### **Database**
- ✅ **Use connection pooling**
- ✅ **Enable SSL connections**
- ✅ **Regular backups**

### **Monitoring**
- ✅ **Set up logging**
- ✅ **Monitor performance**
- ✅ **Set up alerts**

## 🐛 **Troubleshooting**

### **Common Issues**

1. **CORS Errors**
   - Update backend CORS settings
   - Add your frontend domain to allowed origins

2. **Database Connection Issues**
   - Check `DATABASE_URL` format
   - Verify database is accessible

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`

4. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly

## 💰 **Cost Estimation**

### **Free Tier Options**
- **Vercel**: Free (with limitations)
- **Railway**: $5/month (after free trial)
- **Render**: Free (with limitations)
- **Supabase**: Free (with limitations)

### **Production Tier**
- **Vercel**: $20/month
- **Railway**: $20/month
- **Render**: $7/month
- **DigitalOcean**: $5/month

## 📚 **Additional Resources**

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

## 🎉 **Success!**

Once deployed, your Scribsy application will be:
- ✅ **Globally accessible**
- ✅ **Automatically scaled**
- ✅ **Professional grade**
- ✅ **Ready for production use**

---

**Need help?** Check the troubleshooting section or create an issue in your repository.
