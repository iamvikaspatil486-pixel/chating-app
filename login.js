// STEP NAVIGATION
function showStep(stepId){
  document.querySelectorAll(".step").forEach(step => step.classList.remove("active"))
  document.getElementById(stepId).classList.add("active")
}

// PASSWORD VISIBILITY
function togglePass(id){
  const input = document.getElementById(id)
  const icon  = document.getElementById(id + "-icon")
  if(input.type === "password"){
    input.type = "text"
    icon.setAttribute("data-lucide", "eye-off")
  } else {
    input.type = "password"
    icon.setAttribute("data-lucide", "eye")
  }
  lucide.createIcons()
}

// STEP 1 – CHECK ROLL NUMBER
async function checkUser(){
  const roll = document.getElementById("loginRollNo").value.trim().toUpperCase()
  if(!roll){ alert("Please enter Roll Number"); return }

  const { data, error } = await db
    .from("students")
    .select("full_name")
    .eq("roll_no", roll)
    .single()

  if(error || !data){ alert("Roll number not registered"); return }

  showStep("loginStep2")
}

// STEP 2 – LOGIN
async function handleLogin(){
  const roll = document.getElementById("loginRollNo").value.trim().toUpperCase()
  const pass = document.getElementById("loginPassword").value

  if(!pass){ alert("Enter password"); return }

  // Get student info
  const { data: student, error } = await db
    .from("students")
    .select("email, is_approved, full_name")
    .eq("roll_no", roll)
    .single()

  if(error || !student){ alert("Roll number not registered"); return }

  // Sign in with Supabase Auth
  const { data, error: loginError } = await db.auth.signInWithPassword({
    email: student.email,
    password: pass
  })

  if(loginError){ alert("Wrong password"); return }

  if(student.is_approved !== 'true'){
    alert("Waiting for admin approval")
    await db.auth.signOut()
    return
  }

  // Generate a unique session token for this device
  const sessionToken = crypto.randomUUID()
  localStorage.setItem("session_token", sessionToken)

  // Save token to students table — this kicks any other logged-in device
  const { error: tokenError } = await db
    .from("students")
    .update({ session_token: sessionToken })
    .eq("roll_no", roll)

  if(tokenError){
    console.error("Token save failed:", tokenError)
    // Don't block login for this, just continue
  }

  // Save user info locally
  localStorage.setItem("anon_user", JSON.stringify({
    id:   data.user.id,
    name: student.full_name || roll,
    roll: roll
  }))

  window.location.href = "home.html"
}

// FORGOT PASSWORD – SEND RESET LINK
async function sendResetLink(){
  const email = document.getElementById("resetEmail").value.trim()
  if(!email){ alert("Enter email"); return }

  const { data: student, error } = await db
    .from("students")
    .select("email")
    .eq("email", email)
    .single()

  if(error || !student){ alert("Email not registered"); return }

  const { error: resetError } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: "https://studentsharate.me/reset_password.html"
  })

  if(resetError){
    alert(resetError.message)
    console.log(resetError)
  } else {
    alert("Password reset link sent to your email")
  }
}

