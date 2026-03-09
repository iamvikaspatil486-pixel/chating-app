const supabaseUrl = "https://ntfglwfrhljjkzecifuh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM";

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 1. Password Visibility Toggle
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
    lucide.createIcons(); // Re-render Lucide icons
}

// 2. Main Registration Function
async function handleJoinNow(event) {
    // CRITICAL: Stops the page from refreshing/reverting to Step 1
    event.preventDefault(); 
    
    const btn = document.getElementById('submitBtn');
    
    // Collect Form Data
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

    // Loading State
    btn.innerText = "⏳ Requesting Access...";
    btn.disabled = true;

    try {
        // STEP A: Create the Auth Account
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw authError;

        // STEP B: Save to 'students' table if Auth succeeded
        if (authData.user) {
            const { error: dbError } = await _supabase
                .from('students')
                .insert([
                    { 
                        id: authData.user.id, 
                        full_name: fullName, 
                        roll_no: rollNo, 
                        nickname: nickname,
                        email: email,
                        is_approved: false 
                    }
                ]);

            if (dbError) throw dbError;

            // Success UI
            btn.innerText = "✅ Request Sent";
            btn.classList.add('bg-green-600');
            alert("Success! Request submitted to Admin. Check your email (and Spam folder) to verify!");
        }

    } catch (err) {
        console.error("Signup Error:", err.message);
        btn.innerText = "Try Again";
        btn.disabled = false;
        alert("Registration Failed: " + err.message);
    }
}
