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

    // Get join data from query params or localStorage
    const params = new URLSearchParams(window.location.search);
    const batchId = params.get('batch_id') || sessionStorage.getItem('joinBatchId');
    const fullName = sessionStorage.getItem('joinFullName');
    const rollNo = sessionStorage.getItem('joinRollNo');

    if (!batchId || !fullName || !rollNo) {
      throw new Error("Missing join information. Please try again.");
    }

    // Update/create student record
    const { error: studentError } = await db
      .from("students")
      .upsert([{
        id: userId,
        email: userEmail,
        full_name: fullName,
        roll_no: rollNo,
        batch_id: batchId,
        is_approved: false, // Pending approval
      }], {
        onConflict: "id"
      });

    if (studentError) throw new Error(studentError.message);

    // Check if already requested to join this batch
    const { data: existingRequest } = await db
      .from("batch_members")
      .select("*")
      .eq("batch_id", batchId)
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
        document.querySelector("#successState h1").innerText = "Request Already Pending";
        document.querySelector("#successState p").innerText = "You've already sent a request to join this batch.";
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
        batch_id: batchId,
        student_id: userId,
        is_approved: false, // Admin will approve
      }]);

    if (requestError) throw new Error(requestError.message);

    // Clear session storage
    sessionStorage.removeItem('joinBatchId');
    sessionStorage.removeItem('joinFullName');
    sessionStorage.removeItem('joinRollNo');

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

