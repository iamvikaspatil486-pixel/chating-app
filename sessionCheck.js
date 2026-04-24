// ================================================
// SESSION CHECK — include in home.html, chat.html
// <script src="sessionCheck.js"></script>
// ================================================

async function validateSession(){
  const localToken = localStorage.getItem("session_token")
  const user = JSON.parse(localStorage.getItem("anon_user") || "{}")
  const roll = user?.roll

  if(!localToken || !roll){
    logout("Session expired. Please login again.")
    return
  }

  const { data, error } = await db
    .from("students")
    .select("session_token")
    .eq("roll_no", roll)
    .single()

  if(error || !data){
    logout("Could not verify session.")
    return
  }

  // Token mismatch = logged in from another device
  if(data.session_token !== localToken){
    logout("⚠️ You were logged in from another device. This session has ended.")
  }
}

function logout(message){
  localStorage.clear()
  if(message) alert(message)
  window.location.href = "index.html"
}

// Check on page load
validateSession()

// Check every 30 seconds
setInterval(validateSession, 30000)

