// ====================================================================
// VASCON VENUS - CLIENT-SIDE AUTHENTICATION & ACCESS GUARD
// ====================================================================
const SUPABASE_URL = "https://hhlqktcxnyivdnfnlzag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobHFrdGN4bnlpdmRuZm5semFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjE1MDcsImV4cCI6MjEwMjUzNzUwN30.mMrDEdi1ikcId6P0-FJp6bCRJ0vn8lArI3DIRErIzFI";

let supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Protects the current page. Redirects to /login.html if unauthenticated.
 * @param {Array<string>} allowedRoles - Roles permitted on this page (e.g., ['resident', 'ec_member', 'admin'])
 */
async function protectPage(allowedRoles = ['resident', 'ec_member', 'admin']) {
  if (!supabaseClient) {
    window.location.href = 'login.html';
    return null;
  }

  try {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session || !session.user) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return null;
    }

    // Verify user status and role against the approved_residents table
    const userEmail = (session.user.email || '').toLowerCase().trim();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/approved_residents?email=eq.${encodeURIComponent(userEmail)}&select=*`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      await handleUnauthorizedLogout("Access is restricted to Vascon Venus residents. Please contact the Association/EC.");
      return null;
    }

    const records = await response.json();
    if (!records || records.length === 0) {
      await handleUnauthorizedLogout("Access is restricted to Vascon Venus residents. Please contact the Association/EC.");
      return null;
    }

    const resident = records[0];

    if (resident.status !== 'Active') {
      await handleUnauthorizedLogout("Your resident account is currently inactive. Please contact the Association/EC.");
      return null;
    }

    if (!allowedRoles.includes(resident.role)) {
      alert("Access Denied: You do not have permissions to view this committee page.");
      window.location.href = 'index.html';
      return null;
    }

    // Attach user profile to page session
    window.currentUserProfile = resident;
    window.currentAuthSession = session;
    updateUserNavUI(resident);
    return resident;

  } catch (err) {
    console.error("Auth Guard Error:", err);
    window.location.href = 'login.html';
    return null;
  }
}

/**
 * Updates navigation bar with logged-in user details and Logout button
 */
function updateUserNavUI(resident) {
  const userDisplayEl = document.getElementById('user-profile-nav');
  if (userDisplayEl) {
    userDisplayEl.innerHTML = `
      <div class="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200">
        <div class="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px]">
          ${resident.name.charAt(0).toUpperCase()}
        </div>
        <span class="hidden sm:inline">${resident.name}</span>
        <span class="text-amber-400 font-mono text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">${resident.flat_no}</span>
        <button onclick="handleLogout()" title="Logout" class="text-slate-400 hover:text-red-400 ml-1 transition cursor-pointer">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
  }
}

/**
 * Handles clean user logout
 */
async function handleLogout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  window.location.href = 'login.html';
}

async function handleUnauthorizedLogout(message) {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  alert(message);
  window.location.href = 'login.html';
}
