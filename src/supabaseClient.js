import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://gnfzcazcxmvdtaxmczou.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_q-c6NuI6jhyi90toNfcQpg_pzLTVJCs";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
