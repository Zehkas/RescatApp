import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzexwbttwhrqidppznua.supabase.co/rest/v1/';
const supabaseAnonKey = 'sb_publishable_7PORuuFWHhxKSMlrQx9u7Q_V-AQNPNM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
}); 