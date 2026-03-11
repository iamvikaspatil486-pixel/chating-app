// STEP NAVIGATION
function nextStep(){
document.getElementById("step1").classList.remove("active");
document.getElementById("step2").classList.add("active");
}

function prevStep(){
document.getElementById("step2").classList.remove("active");
document.getElementById("step1").classList.add("active");
}


// PASSWORD VISIBILITY
function togglePassword(id){

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


// REGISTRATION
async function handleJoinNow(event){

event.preventDefault();

const btn=document.getElementById("submitBtn");

const fullName=document.getElementById("fullName").value;
const rollNo=document.getElementById("rollNo").value;
const nickname=document.getElementById("nickname").value;
const email=document.getElementById("email").value;
const password=document.getElementById("password").value;
const confPass=document.getElementById("confPass").value;

if(password!==confPass){
alert("Passwords do not match");
return;
}

btn.innerText="Processing...";
btn.disabled=true;

try{

// CHECK ROLL NUMBER UNIQUE
const {data:existing}=await db
.from("students")
.select("roll_no")
.eq("roll_no",rollNo)
.maybeSingle();

if(existing){
alert("Roll number already taken");
btn.innerText="Request Admin";
btn.disabled=false;
return;
}


// CREATE AUTH USER + EMAIL VERIFICATION
const {data,error}=await db.auth.signUp({
email:email,
password:password,
options:{
emailRedirectTo:"https://students-harate.vercel.app/verified.html"
}
});

if(error) throw error;


// INSERT INTO STUDENTS TABLE
const {error:dbError}=await db
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

alert("Request sent successfully. Please verify your email.");

document.getElementById("registrationForm").reset();

}catch(err){

alert(err.message);

btn.innerText="Request Admin";
btn.disabled=false;

}

}
