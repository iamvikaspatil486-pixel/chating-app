// switch steps
function showStep(stepId) {

const steps = document.querySelectorAll(".step");

steps.forEach(step => {
step.classList.remove("active");
});

document.getElementById(stepId).classList.add("active");

}


// next button
function checkUser() {

const roll = document.getElementById("loginRollNo").value;

if(!roll){
alert("Please enter roll number");
return;
}

// go to password step
showStep("loginStep2");

}


// password show/hide
function togglePass(id){

const input = document.getElementById(id);

if(input.type === "password"){
input.type = "text";
}else{
input.type = "password";
}

}


// temporary login
function handleLogin(){
alert("Login button clicked");
}


// forgot password demo
function sendOtp(){
showStep("otpStep");
}

function verifyOtp(){
showStep("newPassStep");
}

function updatePassword(){
alert("Password updated");
}
