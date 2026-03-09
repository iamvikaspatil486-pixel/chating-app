// STEP NAVIGATION (for forgot password)
function showForgot() {
    document.getElementById("loginStep").classList.remove("active");
    document.getElementById("forgotStep").classList.add("active");
}
function backToLogin() {
    document.getElementById("forgotStep").classList.remove("active");
    document.getElementById("loginStep").classList.add("active");
}

// PASSWORD TOGGLE
function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(id + "-icon");
    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
    } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
    }
    lucide.createIcons();
}

// LOGIN FUNCTION
async function handleLogin(event) {
    event.preventDefault();

    const emailOrRoll = document.getElementById("identity").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        // GET USER FROM CUSTOM TABLE
        let { data: student, error } = await db
            .from("students")
            .select("*")
            .or(`roll_no.eq.${emailOrRoll},email.eq.${emailOrRoll}`)
            .maybeSingle();
        if (error) throw error;
        if (!student) {
            alert("Account not found");
            btn.innerText = "Login";
            btn.disabled = false;
            return;
        }

        if (!student.is_approved) {
            alert("Your account is not approved yet");
            btn.innerText = "Login";
            btn.disabled = false;
            return;
        }

        // LOGIN USING AUTH
        const { data, error: authError } = await db.auth.signInWithPassword({
            email: student.email,
            password: password
        });
        if (authError) throw authError;

        btn.innerText = "Success!";
        alert("Login Successful!");
        // redirect to home page (once created)
        // window.location.href = "home.html";
    } catch (err) {
        alert("Login failed: " + err.message);
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

// FORGOT PASSWORD
async function sendReset() {
    const email = document.getElementById("resetEmail").value;
    const btn = document.getElementById("resetBtn");
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        // Check if email exists in approved students
        const { data: student, error } = await db
            .from("students")
            .select("*")
            .eq("email", email)
            .maybeSingle();
        if (error) throw error;
        if (!student || !student.is_approved) {
            alert("Email not verified / not approved");
            btn.innerText = "Send Verification";
            btn.disabled = false;
            return;
        }

        // Send password reset
        const { data, error: resetError } = await db.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/login.html"
        });
        if (resetError) throw resetError;

        alert("Password reset email sent. Check your inbox.");
        btn.innerText = "Sent";
    } catch (err) {
        alert("Error: " + err.message);
        btn.innerText = "Send Verification";
        btn.disabled = false;
    }
}
