// Navigation Helper
function showStep(stepId) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

// Password Toggle
function togglePass(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    input.type = input.type === "password" ? "text" : "password";
    icon.setAttribute('data-lucide', input.type === "password" ? 'eye' : 'eye-off');
    lucide.createIcons();
}

// STEP 1: Check Roll Number
async function checkUser() {
    const roll = document.getElementById('loginRollNo').value.trim().toUpperCase();
    if (!roll) return alert("Please enter Roll No.");

    try {
        const { data, error } = await _supabase
            .from('students')
            .select('full_name')
            .eq('roll_no', roll)
            .single();

        if (error || !data) {
            alert("Roll No. Not Registered!");
            return;
        }

        showStep('loginStep2');
    } catch (err) {
        alert("Connection Error. Try again.");
    }
}

// STEP 2: Handle Login with Specific Errors
async function handleLogin() {
    const roll = document.getElementById('loginRollNo').value.trim().toUpperCase();
    const pass = document.getElementById('loginPassword').value;

    if (!pass) return alert("Please enter your password.");

    try {
        // 1. Get user email from the students table
        const { data: student, error: fetchError } = await _supabase
            .from('students')
            .select('email, is_approved')
            .eq('roll_no', roll)
            .single();

        if (fetchError || !student) {
            alert("Roll No. Not Registered!");
            return;
        }

        // 2. Try to Sign In
        const { data: authData, error: authError } = await _supabase.auth.signInWithPassword({
            email: student.email,
            password: pass
        });

        if (authError) {
            // Check for specific error types
            if (authError.message.includes("Email not confirmed")) {
                alert("Email not verified! Please check your Gmail for the verification link.");
            } else if (authError.message.includes("Invalid login credentials")) {
                alert("Incorrect Password. Please try again.");
            } else {
                alert("Login Error: " + authError.message);
            }
            return;
        }

        // 3. Check Admin Approval after password is confirmed
        if (!student.is_approved) {
            alert("Account pending admin approval! Please wait.");
            // Log them out immediately so they don't stay in session unapproved
            await _supabase.auth.signOut();
            return;
        }

        // Success
        window.location.href = "home.html";

    } catch (err) {
        alert("An unexpected error occurred.");
    }
}

// FORGOT PASSWORD FLOW
async function sendOtp() {
    const email = document.getElementById('resetEmail').value.trim();
    if (!email) return alert("Enter your email");

    const { error } = await _supabase.auth.signInWithOtp({ 
        email: email,
        options: { shouldCreateUser: false } 
    });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("OTP sent! Check your inbox/spam.");
        showStep('otpStep');
    }
}

async function verifyOtp() {
    const email = document.getElementById('resetEmail').value.trim();
    const token = document.getElementById('otpCode').value.trim();

    const { error } = await _supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
    });

    if (error) {
        alert("Invalid or expired OTP code.");
    } else {
        alert("OTP Verified! Set your new password.");
        showStep('newPassStep');
    }
}

async function updatePassword() {
    const newPass = document.getElementById('finalNewPass').value;
    if (newPass.length < 6) return alert("Password must be at least 6 characters.");

    const { error } = await _supabase.auth.updateUser({ password: newPass });

    if (error) {
        alert(error.message);
    } else {
        alert("Password updated! Logging you in...");
        window.location.href = "home.html";
    }
}

