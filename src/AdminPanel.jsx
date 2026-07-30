// This runs on Supabase's servers, never in the browser.
//
// Admin-only (Wascle staff). Given a name, email, and customer, creates
// a real login for an operative — same pattern as Docket's own team
// accounts. No password is set by the admin; the operative gets a
// welcome email with a link to set their own.
//
// Needs these secrets (Supabase -> Edge Functions -> create-operative ->
// Settings -> Secrets):
//   SB_SECRET_KEY     - this project's real secret key
//   SMTP2GO_API_KEY   - for sending the welcome email
//   OPERATIVE_EMAIL_FROM  - the verified "from" address, e.g.
//                           "Wascle Lockit <noreply@wascle.co.uk>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SB_SECRET_KEY');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Missing authorization header.' }, 401);
    const { data: { user: caller } } = await adminClient.auth.getUser(token);
    if (!caller) return json({ error: 'Not signed in.' }, 401);
    const { data: callerRow } = await adminClient.from('operatives').select('role').eq('id', caller.id).maybeSingle();
    if (!callerRow || callerRow.role !== 'admin') {
      return json({ error: 'Only admins can create new operatives.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create';

    if (action === 'delete') {
      const { operativeId } = body;
      if (!operativeId) return json({ error: 'Missing operativeId.' }, 400);
      // Deleting the auth user automatically removes their operatives
      // row too, since it's set up to cascade.
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(operativeId);
      if (deleteErr) return json({ error: deleteErr.message }, 400);
      return json({ success: true }, 200);
    }

    if (action === 'update') {
      const { operativeId, name, customerId, departmentId, role } = body;
      if (!operativeId) return json({ error: 'Missing operativeId.' }, 400);
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (customerId !== undefined) updates.customer_id = customerId || null;
      if (departmentId !== undefined) updates.department_id = departmentId || null;
      if (role !== undefined) updates.role = role;
      const { error: updateErr } = await adminClient.from('operatives').update(updates).eq('id', operativeId);
      if (updateErr) return json({ error: updateErr.message }, 400);
      return json({ success: true }, 200);
    }

    const { name, email, customerId, departmentId } = body;
    if (!name || !email || !customerId) {
      return json({ error: 'Name, email, and customerId are all required.' }, 400);
    }

    // A password still has to be set to create the underlying auth user
    // — but nobody ever uses this one. It's replaced the moment the
    // operative sets their own via the welcome email link.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 400);

    const { error: opErr } = await adminClient.from('operatives').insert({
      id: newUser.user.id, customer_id: customerId, department_id: departmentId || null, name, email, role: 'operative', must_reset_password: true,
    });
    if (opErr) return json({ error: opErr.message }, 400);

    try {
      const { data: linkRow } = await adminClient
        .from('password_setup_tokens').insert({ operative_id: newUser.user.id }).select('token').single();
      if (linkRow) {
        const origin = req.headers.get('origin') || 'https://wascle-lockit.vercel.app';
        const setupLink = `${origin}/#set-password=${linkRow.token}`;
        await sendWelcomeEmail(email, name, setupLink);
      }
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr);
    }

    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: e.message || 'Unknown error.' }, 500);
  }
});

async function sendWelcomeEmail(email: string, name: string, setupLink: string) {
  const greetingName = escapeHtmlServer((name || '').split(' ')[0] || 'there');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#F6F5F2;">
  <div style="font-family: Arial, sans-serif; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E4E1D9;">
      <div style="background-color: #FCB817; padding: 24px 28px;">
        <span style="font-family: Arial, sans-serif; font-weight: 700; font-size: 20px; color: #514F4C;">Wascle Lockit</span>
      </div>
      <div style="padding: 28px; font-family: Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #514F4C;">
        <p style="margin: 0 0 16px;">Hi ${greetingName},</p>
        <p style="margin: 0 0 16px;">You've been set up with access to Wascle Lockit — the app you'll use to request access to your smart skip.</p>
        <p style="margin: 0 0 16px;">Your username is your email address: <b>${escapeHtmlServer(email)}</b></p>
        <p style="margin: 0 0 20px;">Before you can sign in, please set your own password using the button below.</p>
        <p style="margin: 0 0 20px;text-align:center;">
          <a href="${escapeHtmlServer(setupLink)}" style="display: inline-block; background-color: #514F4C; color: #FCB817; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px;">Set your password →</a>
        </p>
        <p style="margin: 24px 0 0;border-top:1px solid #E4E1D9;padding-top:16px;color:#8A8884;font-size:12px;">This is an automatic notification from Wascle Lockit.</p>
      </div>
    </div>
  </div>
</body></html>
  `;
  const apiKey = Deno.env.get('SMTP2GO_API_KEY');
  const fromAddress = Deno.env.get('OPERATIVE_EMAIL_FROM');
  if (!apiKey || !fromAddress) return;
  await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, sender: fromAddress, to: [email], subject: 'Welcome to Wascle Lockit', html_body: html }),
  });
}

function escapeHtmlServer(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
