const SUPABASE_URL =
    "https://fnpjzwmxuewujpdetqqh.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_1_m1PBmOV0mbi5a5Df0PuQ_a4QcIjRX";

const {
    createClient
} = supabase;


const supabaseClient =
    createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


console.log(
    "Supabase connected"
);