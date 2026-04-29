// ── PROCESS REQUEST ON PAGE LOAD ──
window.addEventListener('load', async () => {
  try {
    // Get session from email link
    const { data: sessionData } = await db.auth.getSession();

    if (!sessionData.session) {
      throw new Error("Invalid or expired verification link");
    }

    const userId = sessionData.session.user.id;
    const userEmail = sessionData.session.user.email;

    // Email verified! Now send request to admin
    document.getElementById("verifyingState").classList.add("hidden");
    document.getElementById("sendingState").classList.remove("hidden");

    // Get join data from sessionStorage (set by join.js before sending email)
    const batchId = sessionStorage.getItem('joinBatchId');
    const fullName = sessionStorage.getItem('joinFullName');
    const rollNo = sessionStorage.getItem('joinRollNo');

    // If missing, check localStorage as fallback
    if (!batchId || !fullName || !rollNo) {
      const joinData = JSON.parse(localStorage.getItem('joinData') || '{}');
      if (!joinData.batchId) {
        throw new Error("Missing join information. Please go back and try again.");
      }
      
      sessionStorage.setItem('joinBatchId', joinData.batchId);
      sessionStorage.setItem('joinFullName', joinData.fullName);
      sessionStorage.setItem('joinRollNo', joinData.rollNo);
    }

    const finalBatchId = batchId || JSON.parse(localStorage.getItem('joinData') || '{}').batchId;
    const finalFullName = fullName || JSON.parse(localStorage.getItem('joinData') || '{}').fullName;
    const finalRollNo = rollNo || JSON.parse(localStorage.getItem('joinData') || '{}').rollNo;

    if (!finalBatchId || !finalFullName || !finalRollNo) {
      throw new Error("Missing join information. Please go back and try again.");
    }

    // Update/create student record
    const { error: studentError } = await db
      .from("students")
      .upsert([{
        id: userId,
        email: userEmail,
        full_name: finalFullName,
        roll_no: finalRollNo,
        batch_id: finalBatchId,
        is_approved: false, // Pending approval
      }], {
        onConflict: "id"
      });

    if (studentError) throw new Error(studentError.message);

    // Check if already requested to join this batch
    const { data: existingRequest } = await db
      .from("batch_members")
      .select("*")
      .eq("batch_id", finalBatchId)
      .eq("student_id", userId)
      .maybeSingle();

    if (existingRequest) {
      // Already requested - check if expired (3 days)
      const requestDate = new Date(existingRequest.joined_at);
      const now = new Date();
      const daysDiff = Math.floor((now - requestDate) / (1000 * 60 * 60 * 24));

      if (daysDiff < 3) {
        // Still pending
        document.getElementById("sendingState").classList.add("hidden");
        document.getElementById("successState").classList.remove("hidden");
        
        const successTitle = document.querySelector("#successState h1");
        const successMsg = document.querySelector("#successState > p");
        
        successTitle.innerText = "Request Already Pending";
        successMsg.innerText = "You've already sent a request to join this batch.";
        
        const daysLeft = 3 - daysDiff;
        document.querySelector("#successState .bg-slate-800").innerHTML = `
          <p class="text-slate-400 text-sm">Status: <span class="text-yellow-400 font-semibold">Pending</span></p>
          <p class="text-slate-400 text-xs">Your request will expire in ${daysLeft} day(s). After that, you can send another request.</p>
        `;
        
        return;
      } else {
        // Expired - delete old request and create new one
        await db
          .from("batch_members")
          .delete()
          .eq("id", existingRequest.id);
      }
    }

    // Create batch_members entry (join request)
    const { error: requestError } = await db
      .from("batch_members")
      .insert([{
        batch_id: finalBatchId,
        student_id: userId,
        is_approved: false, // Admin will approve
      }]);

    if (requestError) throw new Error(requestError.message);

    // Clear session/local storage
    sessionStorage.removeItem('joinBatchId');
    sessionStorage.removeItem('joinFullName');
    sessionStorage.removeItem('joinRollNo');
    localStorage.removeItem('joinData');

    // Show success
    document.getElementById("sendingState").classList.add("hidden");
    document.getElementById("successState").classList.remove("hidden");

  } catch (err) {
    console.error("Error:", err);
    document.getElementById("verifyingState").classList.add("hidden");
    document.getElementById("sendingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
    document.getElementById("errorMessage").innerText = err.message || "Something went wrong";
  }
});

function goHome() {
  window.location.href = "home.html";
}

function goBack() {
  window.location.href = "join.html";
}

