// ── Check if already logged in ──
window.addEventListener('load', async () => {
  const { data } = await db.auth.getSession();
  if (data.session) {
    window.location.href = 'home.html';
  }
  lucide.createIcons();
});

let currentBatchId = null;
let verifiedEmail = null;
let emailVerified = false;
let resendTimer = null;

// ── STEP 1: SUBMIT ──
document.getElementById("step1Form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const rollNo = document.getElementById("rollNo").value.trim();
  const batchCode = document.getElementById("batchCode").value.trim().toUpperCase();
  const errorDiv = document.getElementById("step1-error");
  const btn = document.getElementById("continueBtn");

  errorDiv.classList.add("hidden");

  // Validate
  if (!fullName || !rollNo || !batchCode) {
    errorDiv.textContent = "All fields are required";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (batchCode.length !== 6) {
    errorDiv.textContent = "Batch code must be 6 characters";
    errorDiv.classList.remove("hidden");
    return;
  }

  btn.innerText = "Searching...";
  btn.disabled = true;

  try {
    // Check if roll number already exists (but don't block)
    const { data: existingRoll } = await db
      .from("students")
      .select("roll_no")
      .eq("roll_no", rollNo)
      .maybeSingle();

    if (existingRoll) {
      document.getElementById("rollWarning").classList.remove("hidden");
    } else {
      document.getElementById("rollWarning").classList.add("hidden");
    }

    // Fetch batch by code
    const { data: batch, error } = await db
      .from("batches")
      .select("*")
      .eq("batch_code", batchCode)
      .single();

    if (error || !batch) {
      errorDiv.textContent = "Batch code not found";
      errorDiv.classList.remove("hidden");
      btn.innerText = "Continue";
      btn.disabled = false;
      return;
    }

    // Store batch info
    currentBatchId = batch.id;
    document.getElementById("displayCollegeName").innerText = batch.college_name;
    document.getElementById("displayBatchName").innerText = batch.batch_name;
    document.getElementById("batchDetails").classList.remove("hidden");

    // Store in session storage for Step 2
    sessionStorage.setItem("joinData", JSON.stringify({
      fullName: fullName,
      rollNo: rollNo,
      batchId: batch.id
    }));

    // Move to step 2
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
    lucide.createIcons();

    btn.innerText = "Continue";
    btn.disabled = false;

  } catch (err) {
    errorDiv.textContent = err.message || "Error fetching batch";
    errorDiv.classList.remove("hidden");
    btn.innerText = "Continue";
    btn.disabled = false;
  }
});

// ── TOGGLE PASSWORD VISIBILITY ──
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

// ── SEND VERIFICATION LINK ──
async function sendVerificationLink() {
  const email = document.getElementById("email").value.trim();
  const errorDiv = document.getElementById("step2-error");
  const btn = document.getElementById("verifyEmailBtn");

  errorDiv.classList.add("hidden");

  if (!email) {
    errorDiv.textContent = "Email is required";
    errorDiv.classList.remove("hidden");
    return;
  }

  btn.innerText = "Sending...";
  btn.disabled = true;

  try {
    const { error } = await db.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: "https://studentsharate.me/verify.html", // Goes to verify.html
      },
    });

    if (error) throw new Error("Failed to send verification link");

    verifiedEmail = email;
    document.getElementById("verifyEmailBtn").style.display = "none";
    document.getElementById("linkSentMessage").classList.remove("hidden");
    btn.innerText = "Verify Email";
    btn.disabled = false;

    // Start 5-minute timer for resend
    startResendTimer();

  } catch (err) {
    errorDiv.textContent = err.message || "Failed to send link";
    errorDiv.classList.remove("hidden");
    btn.innerText = "Verify Email";
    btn.disabled = false;
  }
}

// ── START 5-MINUTE TIMER FOR RESEND ──
function startResendTimer() {
  let timeLeft = 300; // 5 minutes in seconds

  resendTimer = setInterval(() => {
    timeLeft--;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("timerCount").innerText = 
      `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(resendTimer);
      document.getElementById("resendBtn").classList.remove("hidden");
      document.getElementById("resendTimer").classList.add("hidden");
    }
  }, 1000);
}

// ── RESEND LINK ──
async function resendLink() {
  const btn = document.getElementById("resendBtn");
  btn.innerText = "Resending...";
  btn.disabled = true;

  try {
    await db.auth.signInWithOtp({
      email: verifiedEmail,
      options: {
        emailRedirectTo: "https://studentsharate.me/verify.html",
      },
    });

    btn.innerText = "Link Resent!";
    setTimeout(() => {
      btn.innerText = "Resend Link";
      btn.disabled = false;
      btn.classList.add("hidden");
      document.getElementById("resendTimer").classList.remove("hidden");
      startResendTimer();
    }, 2000);

  } catch (err) {
    btn.innerText = "Resend Link";
    btn.disabled = false;
    alert(err.message);
  }
}

// ── CHECK EMAIL VERIFIED (on page load from magic link) ──
async function checkEmailVerified() {
  const { data: session } = await db.auth.getSession();

  if (session.session) {
    emailVerified = true;
    verifiedEmail = session.session.user.email;

    // Update UI to show verified
    document.getElementById("verifyEmailBtn").style.display = "none";
    document.getElementById("linkSentMessage").classList.add("hidden");
    document.getElementById("emailVerifiedStatus").classList.remove("hidden");
    document.getElementById("passwordSection").classList.remove("hidden");
    document.getElementById("email").value = verifiedEmail;
    document.getElementById("email").disabled = true;
  }
}

// Check on page load
window.addEventListener('load', checkEmailVerified);

// ── STEP 2: SUBMIT JOIN REQUEST ──
document.getElementById("step2Form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorDiv = document.getElementById("step2-error");
  const btn = document.getElementById("sendRequestBtn");

  errorDiv.classList.add("hidden");

  // Check if email verified
  if (!emailVerified) {
    errorDiv.textContent = "Please verify your email first";
    errorDiv.classList.remove("hidden");
    return;
  }

  // Validate passwords
  if (!password || !confirmPassword) {
    errorDiv.textContent = "Password fields are required";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (password !== confirmPassword) {
    errorDiv.textContent = "Passwords do not match";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = "Password must be at least 6 characters";
    errorDiv.classList.remove("hidden");
    return;
  }

  btn.innerText = "Sending Request...";
  btn.disabled = true;

  try {
    // Get join data from session storage
    const joinData = JSON.parse(sessionStorage.getItem("joinData"));

    // Get current session
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session) {
      errorDiv.textContent = "Session expired. Verify email again.";
      errorDiv.classList.remove("hidden");
      btn.innerText = "Send Join Request";
      btn.disabled = false;
      return;
    }

    const userId = sessionData.session.user.id;

    // Update auth password
    const { error: updateError } = await db.auth.updateUser({
      password: password
    });

    if (updateError) throw new Error(updateError.message);

    // Check if already requested to join this batch
    const { data: existingRequest } = await db
      .from("batch_members")
      .select("*")
      .eq("batch_id", currentBatchId)
      .eq("student_id", userId)
      .maybeSingle();

    if (existingRequest) {
      // Already requested - check if expired (3 days)
      const requestDate = new Date(existingRequest.joined_at);
      const now = new Date();
      const daysDiff = Math.floor((now - requestDate) / (1000 * 60 * 60 * 24));

      if (daysDiff < 3) {
        // Still pending, show already requested view
        document.getElementById("step2").style.display = "none";
        document.getElementById("step3").style.display = "block";
        document.getElementById("pendingView").classList.add("hidden");
        document.getElementById("alreadyRequestedView").classList.remove("hidden");
        
        const daysLeft = 3 - daysDiff;
        document.getElementById("expiryInfo").innerText = 
          `Your request will expire in ${daysLeft} day(s). After that, you can send another request.`;
        
        btn.innerText = "Send Join Request";
        btn.disabled = false;
        return;
      } else {
        // Expired - delete old request and create new one
        await db
          .from("batch_members")
          .delete()
          .eq("id", existingRequest.id);
      }
    }

    // Upsert student record
    const { error: studentError } = await db
      .from("students")
      .upsert([{
        id: userId,
        email: verifiedEmail,
        full_name: joinData.fullName,
        roll_no: joinData.rollNo,
        batch_id: currentBatchId,
        is_approved: false, // Pending approval
      }], {
        onConflict: "id"
      });

    if (studentError) throw new Error(studentError.message);

    // Create batch_members entry
    const { error: requestError } = await db
      .from("batch_members")
      .insert([{
        batch_id: currentBatchId,
        student_id: userId,
        is_approved: false,
      }]);

    if (requestError) throw new Error(requestError.message);

    // Clear session storage
    sessionStorage.removeItem("joinData");

    // Show success
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";
    document.getElementById("alreadyRequestedView").classList.add("hidden");
    document.getElementById("pendingView").classList.remove("hidden");

    btn.innerText = "Send Join Request";
    btn.disabled = false;

  } catch (err) {
    errorDiv.textContent = err.message || "Failed to send request";
    errorDiv.classList.remove("hidden");
    btn.innerText = "Send Join Request";
    btn.disabled = false;
  }
});

// ── NAVIGATION ──
function backToStep1() {
  document.getElementById("step2").style.display = "none";
  document.getElementById("step1").style.display = "block";
  if (resendTimer) clearInterval(resendTimer);
  sessionStorage.removeItem("joinData");
}

function goHome() {
  window.location.href = "home.html";
}
