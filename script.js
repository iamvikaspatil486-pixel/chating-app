// STEP NAVIGATION
function nextStep(){
const step1=document.getElementById("step1");
const step2=document.getElementById("step2");

if(step1 && step2){
step1.classList.remove("active");
step2.classList.add("active");
}
}

function prevStep(){
const step1=document.getElementById("step1");
const step2=document.getElementById("step2");

if(step1 && step2){
step2.classList.remove("active");
step1.classList.add("active");
}
}


// PASSWORD TOGGLE
function togglePassword(id){

const input=document.getElementById(id);
const icon=document.getElementById(id+"-icon");

if(!input) return;

if(input.type==="password"){
input.type="text";
if(icon) icon.setAttribute("data-lucide","eye-off");
}else{
input.type="password";
if(icon) icon.setAttribute("data-lucide","eye");
}

if(window.lucide){
lucide.createIcons();
}

}


// REGISTRATION
async function handleJoinNow(event){

event.preventDefault();

const btn=document.getElementById("submitBtn");

const fullName=document.getElementById("fullName")?.value;
const rollNo=document.getElementById("rollNo")?.value;
const email=document.getElementById("email")?.value;
const nickname=document.getElementById("nickname")?.value;
const password=document.getElementById("password")?.value;
const confPass=document.getElementById("confPass")?.value;

if(password!==confPass){
alert("Passwords do not match");
return;
}

btn.innerText="Processing...";
btn.disabled=true;

try{

const {data,error}=await supabase.auth.signUp({
email:email,
password:password,
options:{
emailRedirectTo:window.location.origin+"/login.html"
}
});

if(error) throw error;

const {error:dbError}=await supabase
.from("students")
.insert([{
id:data.user.id,
full_name:fullName,
roll_no:rollNo,
nickname:nickname,
email:email,
is_approved:false
}]);

if(dbError) throw dbError;

btn.innerText="Request Sent";

alert("Registration successful. Verify your email.");

}catch(err){

btn.innerText="Try Again";
btn.disabled=false;

alert(err.message);

}

}



// LOGIN
async function loginUser(event){

event.preventDefault();

const email=document.getElementById("email")?.value;
const password=document.getElementById("password")?.value;

try{

const {data,error}=await supabase.auth.signInWithPassword({
email:email,
password:password
});

if(error){
alert("Invalid email or password");
return;
}

if(!data.user.email_confirmed_at){
alert("Email not verified");
return;
}

const {data:student}=await supabase
.from("students")
.select("*")
.eq("id",data.user.id)
.single();

if(!student){
alert("Student record not found");
return;
}

if(!student.is_approved){
alert("Admin has not approved your account yet");
return;
}

window.location.href="app.html";

}catch(err){

alert(err.message);

}

}
