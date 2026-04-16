// STEP NAVIGATION
function showStep(stepId){

document.querySelectorAll(".step").forEach(step=>{
step.classList.remove("active");
});

document.getElementById(stepId).classList.add("active");

}


// PASSWORD VISIBILITY
function togglePass(id){

const input=document.getElementById(id);
const icon=document.getElementById(id+"-icon");

if(input.type==="password"){
input.type="text";
icon.setAttribute("data-lucide","eye-off");
}else{
input.type="password";
icon.setAttribute("data-lucide","eye");
}

lucide.createIcons();

}


// STEP 1 – CHECK ROLL NUMBER
async function checkUser(){

const roll=document.getElementById("loginRollNo").value.trim().toUpperCase();

if(!roll){
alert("Please enter Roll Number");
return;
}

const {data,error}=await db
.from("students")
.select("full_name")
.eq("roll_no",roll)
.single();

if(error || !data){
alert("Roll number not registered");
return;
}

showStep("loginStep2");

}


// STEP 2 – LOGIN
async function handleLogin(){

const roll=document.getElementById("loginRollNo").value.trim().toUpperCase();
const pass=document.getElementById("loginPassword").value;

if(!pass){
alert("Enter password");
return;
}

const {data:student,error}=await db
.from("students")
.select("email,is_approved, id")
.eq("roll_no",roll)
.single();

if(error || !student){
alert("Roll number not registered");
return;
}

const {data, error:loginError}=await db.auth.signInWithPassword({
email:student.email,
password:pass
});

if(loginError){
alert("login fail");
return;
}

if(!student.is_approved){
alert("Waiting for admin approval");
await db.auth.signOut();
return;
}

// wait for session to be saved
await saveOneSignalPlayerId(data.user.id);
const { data: sessionData } = await db.auth.getSession();

if(sessionData.session){
window.location.href="home.html";
}

}
async function saveOneSignalPlayerId(userId) {
  try {
    const playerId = await OneSignal.getUserId();
    if (!playerId) return;

    await db
      .from("students")
      .update({ onesignal_player_id: playerId })
      .eq("id", userId);

    console.log("✅ OneSignal player ID saved:", playerId);
  } catch (e) {
    console.log("OneSignal not ready:", e);
  }
}


// FORGOT PASSWORD – SEND RESET LINK
async function sendResetLink(){

const email=document.getElementById("resetEmail").value.trim();

if(!email){
alert("Enter email");
return;
}

const {data:student,error}=await db
.from("students")
.select("email")
.eq("email",email)
.single();

if(error || !student){
alert("Email not registered");
return;
}

const {error:resetError}=await db.auth.resetPasswordForEmail(email,{
redirectTo:"https://students-harate.vercel.app/reset_password.html"
});

if(resetError){
alert(resetError.message); 
console.log(resetError);
}else{
alert("Password reset link sent to your email");
}

}
