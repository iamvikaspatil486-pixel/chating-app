async function handleJoinNow(event) {
    event.preventDefault(); 
    const btn = document.getElementById('submitBtn');
    
    // Get values
    const fullName = document.getElementById('fullName').value;
    const rollNo = document.getElementById('rollNo').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 1. Start the "Loading" state
    btn.innerText = "⏳ Processing Request...";
    btn.disabled = true;

    try {
        // STEP A: Create the Auth Account
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw authError;

        // STEP B: Save to your 'students' table
        const { error: dbError } = await _supabase
            .from('students')
            .insert([
                { 
                    id: authData.user.id, 
                    full_name: fullName, 
                    roll_no: rollNo, 
                    email: email,
                    is_approved: false 
                }
            ]);

        if (dbError) throw dbError;

        // 2. Success State - Update the UI
        btn.innerText = "✅ Request Submitted!";
        btn.style.backgroundColor = "#06b6d4"; // Cyan color for success
        
        alert("Success! Request submitted to Admin. Now check your email to verify!");
        
        // Optional: Send them to a thank you page after 3 seconds
        // setTimeout(() => { window.location.href = 'thankyou.html'; }, 3000);

    } catch (err) {
        // 3. Error State - Reset the button
        console.error("Signup Error:", err.message);
        btn.innerText = "Try Again";
        btn.disabled = false;
        alert("Registration Failed: " + err.message);
    }
}
