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
        // STEP 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName, roll_no: rollNo } // Backup in metadata
            }
        });

        if (authError) throw authError;

        // STEP 2: Insert directly into your 'students' table
        // We use the ID generated in Step 1 to link the two
        const { error: dbError } = await _supabase
            .from('students')
            .insert([
                { 
                    id: authData.user.id, 
                    full_name: fullName, 
                    nickname: nickname,
                    roll_no: rollNo, 
                    email: email,
                    is_approved: false 
                }
            ]);

        if (dbError) throw dbError;

        // Success state
        btn.innerText = "Check Your Email!";
        btn.classList.add('bg-slate-700');
        alert("Success! Check your email to verify. Admins will approve Roll No: " + rollNo);
        
    } catch (err) {
        console.error("System Error:", err.message);
        btn.innerText = "Request Admin Approval";
        btn.disabled = false;
        alert("Error: " + err.message);
    }
}
