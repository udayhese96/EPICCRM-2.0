# 🚨 Heavy/Problematic Endpoints That Need Optimization

## 🔴 **CRITICAL - Must Optimize Immediately**

### 1. `/api/analytics/cre-performance`
- **Current Issue:** Fetches ALL 9,294+ records from `lead_master`
- **Problem:** 3 fallback database calls (authenticated → direct → service role)
- **Problem:** Client-side filtering and aggregation
- **Problem:** No caching
- **Impact:** 3-8 second response time

### 2. `/api/analytics/source-cre-distribution`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Complex client-side aggregation for source-CRE mapping
- **Problem:** Multiple database calls with fallback strategy
- **Problem:** Heavy JavaScript processing for data grouping
- **Impact:** 3-8 second response time

### 3. `/api/analytics/latest-call-status-distribution`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Complex status consolidation logic in JavaScript
- **Problem:** Multiple database calls with fallback strategy
- **Problem:** Heavy processing for status hierarchy (6th → 5th → 4th → 3rd → 2nd → 1st call)
- **Impact:** 3-8 second response time

## 🟡 **HIGH PRIORITY - Should Optimize Soon**

### 4. `/api/analytics/admin/overview`
- **Current Issue:** Fetches ALL records with JOIN to `qualified_leads`
- **Problem:** Complex nested queries with `qualified_leads!inner(*)`
- **Problem:** Multiple real-time calculations in JavaScript
- **Impact:** 2-5 second response time

### 5. `/api/analytics/ps-performance`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Client-side PS performance calculations
- **Problem:** Multiple database calls with fallback strategy
- **Impact:** 2-5 second response time

### 6. `/api/analytics/sales-manager/overview`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Complex sales manager metrics calculation
- **Problem:** Multiple database calls with fallback strategy
- **Impact:** 2-5 second response time

### 7. `/api/analytics/team-leader/overview`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Team leader specific aggregations
- **Problem:** Multiple database calls with fallback strategy
- **Impact:** 2-5 second response time

## 🟠 **MEDIUM PRIORITY - Consider Optimizing**

### 8. `/api/analytics/client/overview`
- **Current Issue:** Fetches ALL records from `lead_master`
- **Problem:** Client-side filtering and calculations
- **Impact:** 1-3 second response time

### 9. `/api/analytics/export-comprehensive`
- **Current Issue:** Fetches ALL records for CSV generation
- **Problem:** Multiple database calls with fallback strategy
- **Problem:** Heavy data processing for CSV generation
- **Impact:** 5-10 second response time for large datasets

### 10. `/api/analytics/cre-performance/export`
- **Current Issue:** Fetches ALL records for CSV generation
- **Problem:** Multiple database calls with fallback strategy
- **Impact:** 3-8 second response time

## 🔵 **LOW PRIORITY - Monitor Only**

### 11. `/api/analytics/test`
- **Current Issue:** Fetches ALL records for testing
- **Impact:** 2-5 second response time (test endpoint only)

---

## 📊 **Summary of Problems**

### **Common Issues Across All Endpoints:**
1. **Fetching ALL data** instead of filtered queries
2. **Multiple fallback database calls** (3 attempts per request)
3. **Client-side filtering** instead of SQL WHERE clauses
4. **No caching** - every request hits database
5. **Heavy JavaScript processing** for aggregations
6. **No database indexes** for common query patterns

### **Performance Impact:**
- **Total Records Fetched:** 9,294+ per request
- **Database Calls:** 3+ per request
- **Response Time:** 3-8 seconds average
- **Memory Usage:** High (loading full dataset)
- **CPU Usage:** High (client-side processing)

### **Production Risk:**
- **High** - Will cause timeouts with multiple users
- **High** - Database overload with concurrent requests
- **High** - Poor user experience
- **High** - Server resource exhaustion
