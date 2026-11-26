// Create the first admin login from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
// The admin must change the password on first sign-in.
import { supabaseAdmin } from '@/lib/server/supabase';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME?.trim() || 'Administrator';
if (!email || !password || password.length < 8) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env.local first.');
  process.exit(1);
}

const sb = supabaseAdmin();
const { data: existing } = await sb.from('profiles').select('id, role').eq('email', email).maybeSingle();
if (existing) {
  console.log(`${email} already exists (role: ${existing.role}). Nothing to do.`);
  process.exit(0);
}
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
if (error || !data.user) {
  console.error('Could not create auth user:', error?.message);
  process.exit(1);
}
const { error: pErr } = await sb.from('profiles').insert({ id: data.user.id, full_name: fullName, email, role: 'admin', must_change_password: true });
if (pErr) {
  await sb.auth.admin.deleteUser(data.user.id);
  console.error('Could not create profile:', pErr.message);
  process.exit(1);
}
console.log(`Admin ${email} created. Sign in and set a new password. You can now remove ADMIN_PASSWORD from .env.local.`);
