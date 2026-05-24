-- ==============================================================================
-- MOHEET | مُحِيط — Database Initialization Script
-- يُنفَّذ تلقائياً عند أول إنشاء لحاوية PostgreSQL
-- ==============================================================================

-- تفعيل امتداد UUID لتوليد المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- للبحث النصي المتقدم

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✅ MOHEET Database initialized successfully';
END $$;
