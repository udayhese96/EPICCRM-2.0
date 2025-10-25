# Analytics Architecture - FastAPI Backend Approach

## Why FastAPI Backend is Better for Analytics

### Performance Benefits
- **Server-side Processing**: Complex calculations done on powerful server hardware
- **Database Optimization**: Direct SQL queries with proper indexing
- **Memory Management**: Server can handle large datasets efficiently
- **Parallel Processing**: Multiple analytics can run concurrently

### Scalability Benefits
- **Horizontal Scaling**: Multiple FastAPI instances behind load balancer
- **Caching**: Redis caching for expensive calculations
- **Background Jobs**: Pre-calculate analytics during off-peak hours
- **Database Views**: Materialized views for complex aggregations

### Security Benefits
- **Data Protection**: Raw data never leaves the server
- **Access Control**: Server-side authentication and authorization
- **Audit Logging**: Track who accessed what analytics
- **Rate Limiting**: Prevent abuse of expensive calculations

## Current Implementation

### FastAPI Endpoints
```
GET /analytics/sales-manager/ps-performance?branch={branch}
```
- Processes PS performance data server-side
- Returns aggregated results only
- Includes caching and error handling

### Next.js API Routes
```
GET /api/analytics/sales-manager/ps-performance?branch={branch}
```
- Acts as a proxy to FastAPI backend
- Handles frontend-specific concerns
- Provides fallback mechanisms

## Recommended Analytics Architecture

### 1. FastAPI Analytics Service
```python
# Core analytics endpoints
GET /analytics/sales-manager/ps-performance
GET /analytics/sales-manager/lead-conversion
GET /analytics/sales-manager/team-performance
GET /analytics/sales-manager/branch-comparison

# Caching endpoints
GET /analytics/cache/refresh
POST /analytics/cache/warm-up

# Background processing
POST /analytics/background/calculate-daily-metrics
POST /analytics/background/generate-reports
```

### 2. Database Optimization
```sql
-- Create indexes for analytics queries
CREATE INDEX idx_ps_followup_branch_status ON ps_followup_master(ps_branch, final_status);
CREATE INDEX idx_ps_followup_call_date ON ps_followup_master(first_call_date);
CREATE INDEX idx_ps_followup_ps_name ON ps_followup_master(ps_name);

-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW daily_ps_metrics AS
SELECT 
    ps_branch,
    ps_name,
    DATE(created_at) as date,
    COUNT(*) as total_leads,
    -- ... other metrics
FROM ps_followup_master
GROUP BY ps_branch, ps_name, DATE(created_at);
```

### 3. Caching Strategy
```python
# Redis caching for expensive calculations
@cache(expire=300)  # 5 minutes
async def get_ps_performance_analytics(branch: str):
    # Expensive calculation
    pass

# Background cache warming
async def warm_up_analytics_cache():
    # Pre-calculate for all branches
    pass
```

### 4. Background Processing
```python
# Celery tasks for heavy analytics
@celery.task
def calculate_daily_metrics():
    # Run during off-peak hours
    pass

@celery.task
def generate_weekly_reports():
    # Generate reports in background
    pass
```

## Migration Strategy

### Phase 1: Current Implementation ✅
- [x] FastAPI endpoint for PS performance
- [x] Next.js proxy to FastAPI
- [x] Basic error handling

### Phase 2: Enhanced Analytics
- [ ] Add caching with Redis
- [ ] Create materialized views
- [ ] Add more analytics endpoints
- [ ] Implement background processing

### Phase 3: Advanced Features
- [ ] Real-time analytics with WebSockets
- [ ] Export functionality (PDF, Excel)
- [ ] Custom date range filtering
- [ ] Advanced visualizations

## Performance Comparison

| Metric | Frontend Processing | FastAPI Backend |
|--------|-------------------|-----------------|
| Data Transfer | 10MB+ raw data | 50KB aggregated |
| Processing Time | 5-10 seconds | 200-500ms |
| Memory Usage | 100MB+ browser | 10MB server |
| Scalability | Limited | High |
| Caching | None | Redis + DB |
| Security | Data exposed | Data protected |

## Environment Variables

```bash
# .env.local
FASTAPI_BASE_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
ANALYTICS_CACHE_TTL=300
```

## Next Steps

1. **Test the current implementation** with real data
2. **Add Redis caching** for better performance
3. **Create more analytics endpoints** for different metrics
4. **Implement background processing** for heavy calculations
5. **Add monitoring and logging** for analytics performance
