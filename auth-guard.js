// ====================================================================
// NATIVE AUTH GUARD (Zero Dependencies)
// ====================================================================
const SUPABASE_URL = "https://hhlqktcxnyivdnfnlzag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobHFrdGN4bnlpdmRuZm5semFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjE1MDcsImV4cCI6MjEwMjUzNzUwN30.mMrDEdi1ikcId6P0-FJp6bCRJ0vn8lArI3DIRErIzFI";

async function protectPage(allowedRoles = ['resident', 'ec_member', 'admin']) {
  const token = localStorage.getItem('venus_auth_token');
  const email = localStorage.getItem('venus_auth_email');

  if (!token || !email) {
    window.location.href = 'login.html';
    return null;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/approved_residents?email=ilike.${encodeURIComponent(email)}&select=*`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      localStorage.clear();
      window.location.href = 'login.html';
      return null;
    }

    const records = await res.json();
    if (!records || records.length === 0) {
      localStorage.clear();
      window.location.href = 'login.html';
      return null;
    }

    const resident = records[0];

    if (resident.status !== 'Active') {
      localStorage.clear();
      alert("Your account is currently inactive. Contact the Association.");
      window.location.href = 'login.html';
      return null;
    }

    if (!allowedRoles.includes(resident.role)) {
      alert("Access Denied: You do not have permission to view this committee page.");
      window.location.href = 'index.html';
      return null;
    }

    // Update Nav with User profile & Logout
    updateUserNavUI(resident);
    return resident;

  } catch (e) {
    console.error("Auth Guard Error:", e);
    return null;
  }
}

function updateUserNavUI(resident) {
  const userDisplayEl = document.getElementById('user-profile-nav');
  if (userDisplayEl) {
    userDisplayEl.innerHTML = `
      <div class="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200">
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

function handleLogout() {
  localStorage.clear();
  window.location.href = 'login.html';
}
