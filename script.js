async function handleJoinNow(event) {
    event.preventDefault(); 
    
    const btn = document.getElementById('submitBtn');
    const fullName = document.getElementById('fullName').value;
    const nickname = document.getElementById('nickname').value || '';
    const rollNo = document.getElementById('rollNo').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confPass = document.getElementById('confPass').value;

    if (password !== confPass) {
        alert("Passwords do not match!");
        return;
    }

    btn.innerText = "Sending Request...";
    btn.disabled = true;

    try {
        // Notice we use _supabase here to match supabase.js
        const { data, error } = await _supabase.auth.signUp({
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

        btn.innerText = "Check Your Email!";
        btn.classList.add('bg-slate-700');
        alert("Success! Check your email to verify your account.");
        
    } catch (err) {
        console.error("Auth Error:", err.message);
        btn.innerText = "Request Admin Approval";
        btn.disabled = false;
        alert("Error: " + err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleJoinNow);
    }
});
