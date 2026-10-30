// Cloud sync settings (README: "Supabase setup"). Leave the URL and key empty
// to play local-only. The publishable (anon) key is meant to be public: Row
// Level Security plus disabled sign-ups protect the data, never a secret key.
// Never put a service-role key here.
export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';

// The login form maps a username without '@' to username@ACCOUNT_EMAIL_DOMAIN.
// Create the dashboard user with exactly that email. `.invalid` is reserved
// (RFC 2606), so the address can never belong to anyone; Supabase only runs
// its stricter mail checks when it sends mail, which this setup never does.
export const ACCOUNT_EMAIL_DOMAIN = 'republic-frontline.invalid';
