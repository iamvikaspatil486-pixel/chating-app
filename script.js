const supabaseUrl = "https://ntfglwfrhljjkzecifuh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM";

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Password Visibility Toggle
function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (input.type === "password") {
        input.type = "text";
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = "password";
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons(); // Refresh icons
}

async function handleJoinNow(event) {
    event.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const fullName = document.getElementById('fullName').value;
    const rollNo = document.getElementById('rollNo').value;
    const email = document.getElementById('email').value;
    const nickname = document.getElementById('nickname').value;
    const password = document.getElementById('password').value;
    const confPass = document.getElementById('confPass').value;

    if (password !== confPass) {
        alert("Passwords do not match!");
        return;
    }

    btn.innerText = "⏳ Processing...";
    btn.disabled = true;

    try {
        // STEP 1: Auth Sign Up
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw authError;

        if (authData.user) {
            // STEP 2: Insert into customized 'students' table
            const { error: dbError } = await _supabase
                .from('students')
                .insert([
                    { 
                        id: authData.user.id, // Links to Auth
                        full_name: fullName, 
                        roll_no: rollNo, 
                        nickname: nickname,
                        email: email,
                        is_approved: false 
                    }
                ]);

            if (dbError) throw dbError;
        }

        btn.innerText = "✅ Success!";
        alert("Registration successful! Check your email to verify your account.");

    } catch (err) {
        console.error("Signup Error:", err.message);
        btn.innerText = "Try Again";
        btn.disabled = false;
        alert("Error: " + err.message);
    }
}
