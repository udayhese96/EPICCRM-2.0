# 🔧 API Troubleshooting Guide

## 🚨 FIXING 404 API ERRORS

### **Quick Fix Steps:**

#### 1. **Restart Next.js Development Server**
```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

#### 2. **Start FastAPI Backend**
```bash
# In a separate terminal:
cd backend
python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. **Use Batch Script (Windows)**
```bash
# Double-click or run:
start_dev_servers.bat
```

---

## 🧪 **Test API Endpoints**

### **Visit Debug Page:**
Go to: `http://localhost:3000/debug/api`

This page will test:
- ✅ Basic API functionality
- ✅ CRE users API via Next.js proxy
- ✅ Direct FastAPI connection

### **Manual Tests:**

#### Test Next.js API:
```bash
curl http://localhost:3000/api/test
```

#### Test FastAPI directly:
```bash
curl http://localhost:8000/api/cre-users
```

---

## 🔍 **Common Issues & Solutions**

### **Issue 1: 404 on /api/cre-users**
**Cause:** Next.js API routes not recognized
**Solution:** 
1. Restart Next.js server: `npm run dev`
2. Clear browser cache
3. Check if `app/api/cre-users/route.ts` exists

### **Issue 2: FastAPI not running**
**Cause:** Backend server not started
**Solution:**
```bash
cd backend
python -m uvicorn fastapi_app.main:app --reload --port 8000
```

### **Issue 3: CORS errors**
**Cause:** Cross-origin requests blocked
**Solution:** The API proxy routes should fix this automatically

### **Issue 4: Database connection errors**
**Cause:** Supabase credentials or database not accessible
**Solution:** 
1. Check Supabase connection in FastAPI logs
2. Verify database tables exist: `cre_users`, `ps_users`, `lead_master`

---

## 🚀 **Correct Startup Sequence**

### **Method 1: Automatic (Recommended)**
```bash
# Run the batch script:
start_dev_servers.bat
```

### **Method 2: Manual**
```bash
# Terminal 1 - FastAPI Backend
cd backend
python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Next.js Frontend
npm run dev
```

---

## 📊 **Verify Everything is Working**

### **Check URLs:**
- ✅ Next.js Frontend: http://localhost:3000
- ✅ FastAPI Backend: http://localhost:8000
- ✅ FastAPI Docs: http://localhost:8000/docs
- ✅ Debug Page: http://localhost:3000/debug/api

### **Test CRE User Creation:**
1. Go to: http://localhost:3000/admin/manage-cre
2. Click "Add CRE User"
3. Fill form and submit
4. Should save to `cre_users` table successfully

---

## 🔄 **Fallback Mode**

If Next.js API routes still don't work, the frontend now has **automatic fallback**:
- First tries: `/api/cre-users` (Next.js proxy)
- If that fails: `http://localhost:8000/api/cre-users` (Direct FastAPI)

---

## 📝 **Log Files to Check**

### **Next.js Terminal Output:**
Look for:
- `✓ Ready in [time]ms`
- API route compilation messages

### **FastAPI Terminal Output:**
Look for:
- `INFO: Uvicorn running on http://0.0.0.0:8000`
- Database connection messages
- Request logs: `POST /api/cre-users HTTP/1.1`

### **Browser Console:**
- Check for CORS errors
- Look for 404/500 error details
- Network tab shows actual request URLs

---

## 🆘 **If All Else Fails**

1. **Check ports:** Make sure 3000 and 8000 are available
2. **Restart computer:** Sometimes helps with port conflicts
3. **Try incognito mode:** Bypasses cache issues
4. **Check antivirus/firewall:** May block local API calls

The system should now work with both the proxy routes AND direct FastAPI fallback! 🎉
