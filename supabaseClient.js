import { createClient } from '@supabase/supabase-js';

// 在 Supabase Dashboard 获取的 URL 和 API 密钥
const SUPABASE_URL = 'https://gigzrgapctbdrbmbkcia.supabase.co';  // 替换为你的 Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZ3pyZ2FwY3RiZHJibWJrY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTI2NDIsImV4cCI6MjA3NzcyODY0Mn0.F6dnpa2--Q-xy1mlndbvsmKvvHN1hSKgh-kykCztNwQ';  // 替换为你的 Supabase anon 密钥

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
