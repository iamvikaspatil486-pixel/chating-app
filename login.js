// --- 1. SHARED UI HELPERS ---
function showStep(stepId) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function togglePass(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    input.type = input.type === "password" ? "text" : "password";
    icon.setAttribute('data-lucide', input.type === "password" ? 'eye' : 'eye-off');
    lucide.createIcons();
}

// --- 2. LOGIN & ROLL NO CHECK ---
async function checkUser() {
    const roll = document.getElementById('loginRollNo').value.trim().toUpperCase();
    const btn = document.getElementById('nextBtn');
    if(!roll) return alert("Please enter Roll No.");
    
    btn.innerText = "🔍 Checking...";
    // Using _supabase from your config file
    const { data, error } = await _supabase.from('students').select('full_name').eq('roll_no', roll).single();

    if (error || !data) {
        alert("Roll No. Not Registered!");
        btn.innerText = "Next";
        return;
    }
    showStep('loginStep2');
}

async function handleLogin(e) {
    const roll = document.getElementById('loginRollNo').value.toUpperCase();
    const pass = document.getElementById('loginPassword').value;
    const { data: userRow } = await _supabase.from('students').select('email, is_approved').eq('roll_no', roll).single();

    if(!userRow.is_approved) return alert("Account pending admin approval!");

    const { error } = await _supabase.auth.signInWithPassword({ email: userRow.email, password: pass });
    if (error) return alert("Invalid Password");
    window.location.href = "home.html";
}

// --- 3. OTP FORGOT PASSWORD FLOW ---
async function sendOtp() {
    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.getElementById('sendOtpBtn');
    if(!email) return alert("Enter your verified email");

    btn.innerText = "Sending OTP...";
    // Sends OTP ONLY if the email is verified/exists in Auth
    const { error } = await _supabase.auth.signInWithOtp({ email: email });

    if (error) {
        alert("Error: " + error.message);
        btn.innerText = "Send OTP";
    } else {
        alert("OTP sent to " + email + ". Check your inbox/spam.");
        showStep('otpStep');
    }
}

async function verifyOtp() {
    const email = document.getElementById('resetEmail').value;
    const token = document.getElementById('otpCode').value;
    const btn = document.getElementById('verifyOtpBtn');

    btn.innerText = "Verifying...";
    const { error } = await _supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'magiclink'
    });

    if (error) {
        alert("Invalid or Expired OTP");
        btn.innerText = "Verify OTP";
    } else {
        alert("OTP Verified! Set your new password.");
        showStep('newPassStep');
    }
}

async function updatePassword() {
    const newPass = document.getElementById('finalNewPass').value;
    if(newPass.length < 6) return alert("Password too short!");

    const { error } = await _supabase.auth.updateUser({ password: newPass });
    if (error) return alert(error.message);
    
    alert("Password Updated! Logging you in...");
    window.location.href = "home.html";
}
