const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying timestamp columns migration...');
  
  try {
    // Execute the SQL to add timestamp columns
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE deliveries 
        ADD COLUMN IF NOT EXISTS voucher_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS accounting_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS parpo_approval_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS cash_processing_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS parpo_signature_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS tax_processing_completed_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP NULL;
      `
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      
      // Try alternative approach using direct SQL
      console.log('Trying alternative approach...');
      
      const { data, error: altError } = await supabase
        .from('deliveries')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('Database connection error:', altError);
      } else {
        console.log('Database connection successful, but migration failed');
        console.log('Please manually run the SQL from 20260504_add_payment_completion_timestamps.sql');
      }
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigration();
