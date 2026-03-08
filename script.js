// 1. Initialize Supabase (Use your actual keys from Supabase Dashboard)
const supabaseUrl = 'https://ntfglwfrhljjkzecifuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM';
const _supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. The "Join Now" logic with Error Handling
async function handleJoinNow(event) {
    event.preventDefault(); // Prevents the page from refreshing
    
    const btn = document.getElementById('submitBtn');
    const fullName = document.getElementById('fullName').value;
    const nickname = document.getElementById('nickname').value || '';
    const rollNo = document.getElementById('rollNo').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Start "Sending" state
    btn.innerText = "Sending Request...";
    btn.disabled = true;

    try {
        // Sign up user with Metadata
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    full_name: fullName,
                    roll_no: rollNo,
                    nickname: nickname,
                    is_approved: false // For your admin approval logic
                }
            }
        });

        if (error) throw error; // If Supabase says no, jump to the catch block

        // Success!
        btn.innerText = "Check Your Email!";
        alert("Account request sent! Please verify your email. Admins will check your Roll No: " + rollNo);
        
    } catch (err) {
        // Reset the button so the user can try again
        console.error("Registration Error:", err.message);
        btn.innerText = "Request Admin Approval";
        btn.disabled = false;

        // Specific message for the 2-email limit
        if (err.message.includes("rate limit")) {
            alert("Limit reached! Supabase allows 2 requests per hour. Please wait a bit.");
        } else {
            alert("Error: " + err.message);
        }
    }
}

// 3. Connect the form to this script
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleJoinNow);
    }
});
