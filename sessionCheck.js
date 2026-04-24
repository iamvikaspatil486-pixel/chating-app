// ================================================
// SESSION CHECK — include in home.html, chat.html
// <script src="sessionCheck.js"></script>
// ================================================

async function validateSession(){
  const localToken = localStorage.getItem("session_token")

  // No token = not logged in yet, just skip silently
  if(!localToken) return

  let user = {}
  try { user = JSON.parse(localStorage.getItem("anon_user") || "{}") } catch(e){}

  // Try roll from different possible keys
  const roll = user?.roll || user?.roll_no || user?.rollNo

  // If no roll found, skip check silently (don't logout)
  if(!roll) return

  try {
    const { data, error } = await db
      .from("students")
      .select("session_token")
      .eq("roll_no", roll)
      .single()

    // If DB error (network issue etc), skip silently — don't logout
    if(error || !data) return

    // Token mismatch = logged in from another device
    if(data.session_token && data.session_token !== localToken){
      logout("⚠️ You were logged in from another device. This session has ended.")
    }

  } catch(e){
    // Network error — skip silently, don't logout
    console.warn("Session check failed silently:", e)
  }
}

function logout(message){
  localStorage.clear()
  if(message) alert(message)
  window.location.href = "index.html"
}

// Small delay on page load to let DB connection settle
setTimeout(validateSession, 2000)

// Check every 30 seconds
setInterval(validateSession, 30000)
