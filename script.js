// 🔹 REPLACE WITH YOUR OWN
const SUPABASE_URL = "https://ntfglwfrhljjkzecifuh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Select buttons
const registerBtn = document.querySelector(".register");
const loginBtn = document.querySelector(".login");

// When Register button is clicked
registerBtn.addEventListener("click", function () {
    
    alert("Opening Register Page...");

    // redirect to register page
    window.location.href = "register.html";
});


// When Login button is clicked
loginBtn.addEventListener("click", function () {

    alert("Opening Login Page...");

    // redirect to login page
    window.location.href = "login.html";
});


// Small welcome animation when page loads
window.addEventListener("load", function(){

    const card = document.querySelector(".card");

    card.style.transform = "scale(0.9)";
    card.style.opacity = "0";

    setTimeout(() => {
        card.style.transition = "0.5s";
        card.style.transform = "scale(1)";
        card.style.opacity = "1";
    }, 100);

});
if ("serviceWorker" in navigator) {
navigator.serviceWorker.register("service-worker.js")
.then(function(){
console.log("Service Worker Registered");
});
}
async function sendVerification(){

const email = document.getElementById("email").value

if(!email){
alert("Enter email first")
return
}

const { data, error } = await supabase.auth.signUp({
email: email,
password: "temporary123"
})

if(error){
alert("Error sending verification")
}else{
alert("Verification email sent. Check your inbox.")
}

}
