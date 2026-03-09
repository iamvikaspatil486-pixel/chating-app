// Step navigation
function nextStep(){
document.getElementById("step1").classList.remove("active");
document.getElementById("step2").classList.add("active");
}

function prevStep(){
document.getElementById("step2").classList.remove("active");
document.getElementById("step1").classList.add("active");
}


// Password visibility toggle
function togglePassword(id){

const input = document.getElementById(id);
const icon = document.getElementById(id + "-icon");

if(input.type === "password"){
input.type = "text";
icon.setAttribute("data-lucide","eye-off");
}else{
input.type = "password";
icon.setAttribute("data-lucide","eye");
}

lucide.createIcons();

}


// Registration function
async function handleJoinNow(event){

event.preventDefault();

const btn = document.getElementById("submitBtn");

const fullName = document.getElementById("fullName").value;
const rollNo = document.getElementById("rollNo").value;
const email = document.getElementById("email").value;
const nickname = document.getElementById("nickname").value;
const password = document.getElementById("password").value;
const confPass = document.getElementById("confPass").value;

if(password !== confPass){
alert("Passwords do not match");
return;
}

btn.innerText = "Processing...";
btn.disabled = true;

try{

// Create Supabase Auth user
const { data, error } = await _supabase.auth.signUp({
email: email,
password: password
});

if(error) throw error;


// Save student data
await _supabase
.from("students")
.insert([
{
id: data.user.id,
full_name: fullName,
roll_no: rollNo,
nickname: nickname,
email: email,
is_approved: false
}
]);

btn.innerText = "Request Sent";

alert("Success! Please check your email to verify.");

}catch(err){

btn.innerText = "Try Again";
btn.disabled = false;

alert("Registration Failed: " + err.message);

}

}
