async function handleJoinNow(event) {
    event.preventDefault(); // Prevents page refresh
    
    const btn = document.getElementById('submitBtn');
    const fullName = document.getElementById('fullName').value;
    const nickname = document.getElementById('nickname').value || '';
    const rollNo = document.getElementById('rollNo').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confPass = document.getElementById('confPass').value;

    // Check if passwords match
    if (password !== confPass) {
        alert("Passwords do not match!");
        return;
    }

    // Start "Sending" state
    btn.innerText = "Sending Request...";
    btn.disabled = true;

    try {
        // Sign up user via Supabase Auth
        // This creates a user and stores extra info in 'user_metadata'
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    full_name: fullName,
                    roll_no: rollNo,
                    nickname: nickname,
                    is_approved: false 
                }
            }
        });

        if (error) throw error;

        // Success state
        btn.innerText = "Check Your Email!";
        btn.classList.remove('from-cyan-600', 'to-blue-600');
        btn.classList.add('bg-slate-700', 'cursor-default');
        
        alert("Account request sent! Please check your email inbox to verify your account.");
        
    } catch (err) {
        console.error("Registration Error:", err.message);
        btn.innerText = "Request Admin Approval";
        btn.disabled = false;

        if (err.message.includes("rate limit")) {
            alert("Limit reached! Please wait an hour before trying again.");
        } else {
            alert("Error: " + err.message);
        }
    }
}

// Connect the form to the script after the page loads
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleJoinNow);
    }
});
