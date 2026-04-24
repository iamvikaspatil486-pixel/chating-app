// ================================================
// SESSION CHECK — include in home.html, chat.html
// <script src="sessionCheck.js"></script>
// ================================================

let sessionCheckChannel = null

async function startSessionWatch(){
  const localToken = localStorage.getItem("session_token")
  if(!localToken) return

  let user = {}
  try { user = JSON.parse(localStorage.getItem("anon_user") || "{}") } catch(e){}

  const roll = user?.roll || user?.roll_no || user?.rollNo
  if(!roll) return

  // First do an immediate check
  try {
    const { data, error } = await db
      .from("students")
      .select("session_token, full_name")
      .eq("roll_no", roll)
      .single()

    if(error || !data) return

    if(data.session_token && data.session_token !== localToken){
      forceLogout()
      return
    }

    // Watch for session_token changes in realtime
    sessionCheckChannel = db
      .channel("session-watch-" + roll)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "students",
          filter: `roll_no=eq.${roll}`
        },
        (payload) => {
          const newToken = payload.new?.session_token
          if(newToken && newToken !== localToken){
            forceLogout()
          }
        }
      )
      .subscribe()

  } catch(e){
    console.warn("Session watch error:", e)
  }
}

function forceLogout(){
  // Remove realtime channel
  if(sessionCheckChannel){
    db.removeChannel(sessionCheckChannel)
    sessionCheckChannel = null
  }

  localStorage.clear()

  // Show alert then redirect
  alert("⚠️ Your account was logged in from another device. You have been logged out.")
  window.location.href = "index.html"
}

// Start watching after 2 seconds
setTimeout(startSessionWatch, 2000)
