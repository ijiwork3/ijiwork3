
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvoocknpwdjkcgkgpsmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x-R11uxpCIkjnrvxFqHmQQ_gZnfkLaJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
