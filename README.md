# Wascle Smart Skips

A PWA (installable web app) for housing association employees to request
access to a Wascle smart skip, log GPS proximity, capture the required
photos, generate a real one-time igloohome access code, and track tip
duration and volume for cost-splitting reports.

Built on the same stack as Docket — Supabase, Vercel, GitHub.

## 1. Run the database migration

In your new Supabase project: **SQL Editor → New query** → paste the
contents of `migration-schema.sql` → **Run**.

This creates the `skips`, `departments`, `employees`, and `visits`
tables, plus a private storage bucket for photos.

## 2. Deploy the Edge Function

- **Edge Functions → Deploy a new function → via editor**
- Name it exactly `generate-visit-code`
- Paste in the code from `supabase-functions/generate-visit-code.ts`
- **Deploy**
- Go to its **Settings** tab and turn **"Verify JWT with legacy secret"** OFF
  (this one's called by the app with no login, same reasoning as Docket's
  public-facing functions)

## 3. Add two secrets

**Edge Functions → Secrets**:
- `SB_SECRET_KEY` — your project's real secret key (Project Settings →
  API → Secret keys → `default`) — same pattern as Docket, watch out for
  line breaks when copying it
- `IGLOOHOME_API_KEY` — your real API key from igloodeveloper.co

## 4. Plug in your Supabase project details

Open `src/App.jsx` and find these two lines near the top:

```js
const SUPABASE_URL = "SUPABASE_URL_PLACEHOLDER";
const SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY_PLACEHOLDER";
```

Replace with your real values from **Project Settings → API**:
- `SUPABASE_URL_PLACEHOLDER` → your Project URL
- `SUPABASE_ANON_KEY_PLACEHOLDER` → your publishable key (starts `sb_publishable_...`)

## 5. Register your padlock's real device ID

Once deployed, open the app, and on the first screen it'll ask you to
enter the padlock's **igloohome Device ID** (found in the igloohome app,
under the lock's Settings) before registering the smart skip's location.

## 6. Add at least one department

The app needs at least one department for staff to pick from. Add a
couple to test with — SQL Editor:

```sql
insert into departments (name) values ('Day to day repairs'), ('Voids'), ('Planned works');
```

## Deploying the app itself

This is a **real Vite build**, unlike Docket's single-file setup — Vercel
handles the build step automatically.

1. Create a new GitHub repo, push all these files to it
2. Go to **vercel.com → Add New → Project**, import that repo
3. Vercel will auto-detect it as a Vite project — no configuration needed,
   just click **Deploy**
4. You'll get a `.vercel.app` URL — open it on a phone and use **"Add to
   Home Screen"** (Safari) or the install prompt (Chrome/Android) to
   install it like a real app

## Testing with the real padlock

1. Open the installed app
2. Enter the padlock's igloohome Device ID and register the smart skip
   at its real location
3. Walk through the flow — confirm proximity, enter your name and
   department, estimate volume, take the waste photo
4. On the access code screen, tap **"Generate access code"** — this
   calls the real igloohome API and returns a genuine one-time PIN
5. Type that PIN into the padlock's keypad
6. Take the "opened" and "after" photos, save the visit
7. Check **Table Editor → visits** in Supabase to see the full real
   record, including photo paths (viewable via **Storage → visit-photos**)

## Reports (cost-splitting, CSV export)

Not built into the app UI yet — for now, query directly in Supabase's
SQL Editor. Two examples:

**CSV-style export:**
```sql
select v.created_at, s.name as skip_name, v.employee_name, v.department,
       v.volume_yd3, v.distance_m, v.code, v.duration_ms, v.status
from visits v join skips s on s.id = v.skip_id
order by v.created_at desc;
```
(Use the "Download as CSV" button in the SQL Editor's results view.)

**Cost split by department:**
```sql
select department, sum(volume_yd3) as total_volume, count(*) as visit_count
from visits
where department is not null
group by department;
```
Then apportion your total skip cost by each department's share of the
total volume.

Happy to build a proper in-app reports page for this once the core flow
is proven with the real padlock.
