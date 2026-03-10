// Navigation between steps
function showStep(stepId){
document.querySelectorAll(".step").forEach(step=>{
step.classList.remove("active");
});
document.getElementById(stepId).classList.add("active");
}


// Toggle password visibility
function togglePass(id){

const input = document.getElementById(id);
const icon = document.getElementById(id+"-icon");

if(input.type==="password"){
input.type="text";
icon.setAttribute("data-lucide","eye-off");
}else{
input.type="password";
icon.setAttribute("data-lucide","eye");
}

lucide.createIcons();

}


// STEP 1 – Check Roll Number
async function checkUser(){

const roll = document.getElementById("loginRollNo").value.trim().toUpperCase();

if(!roll){
alert("Please enter Roll Number");
return;
}

const {data,error} = await db
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


// STEP 2 – Login
async function handleLogin(){

const roll = document.getElementById("loginRollNo").value.trim().toUpperCase();
const pass = document.getElementById("loginPassword").value;

if(!pass){
alert("Enter password");
return;
}

const {data:student,error} = await db
.from("students")
.select("email,is_approved")
.eq("roll_no",roll)
.single();

if(error || !student){
alert("Roll number not registered");
return;
}

const {error:loginError} = await db.auth.signInWithPassword({
email:student.email,
password:pass
});

if(loginError){
alert("Wrong password");
return;
}

if(!student.is_approved){
alert("Waiting for admin approval");
await db.auth.signOut();
return;
}

window.location.href="home.html";

}


// Forgot password
async function sendOtp(){

const email=document.getElementById("resetEmail").value;

if(!email){
alert("Enter email");
return;
}

const {error}=await db.auth.signInWithOtp({
email:email,
options:{shouldCreateUser:false}
});

if(error){
alert(error.message);
}else{
alert("OTP sent to email");
showStep("otpStep");
}

}


// Verify OTP
async function verifyOtp(){

const email=document.getElementById("resetEmail").value;
const token=document.getElementById("otpCode").value;

const {error}=await db.auth.verifyOtp({
email:email,
token:token,
type:"email"
});

if(error){
alert("Invalid OTP");
}else{
showStep("newPassStep");
}

}


// Update password
async function updatePassword(){

const newPass=document.getElementById("finalNewPass").value;

if(newPass.length<6){
alert("Password must be 6 characters");
return;
}

const {error}=await db.auth.updateUser({
password:newPass
});

if(error){
alert(error.message);
}else{
alert("Password updated");
window.location.href="home.html";
}

}
