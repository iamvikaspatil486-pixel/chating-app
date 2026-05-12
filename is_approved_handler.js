// ==========================================
// FUNCTION TO CHECK IF STUDENT IS APPROVED
// Handles both TEXT ('true'/'false') and BOOLEAN (true/false)
// ==========================================

function isStudentApproved(is_approved) {
  // Handle BOOLEAN
  if (typeof is_approved === 'boolean') {
    return is_approved === true;
  }

  // Handle TEXT
  if (typeof is_approved === 'string') {
    return is_approved.toLowerCase() === 'true';
  }

  // Handle NULL/undefined
  return false;
}

function isBatchMemberApproved(is_approved) {
  // Handle BOOLEAN
  if (typeof is_approved === 'boolean') {
    return is_approved === true;
  }

  // Handle TEXT
  if (typeof is_approved === 'string') {
    return is_approved.toLowerCase() === 'true';
  }

  // Handle NULL/undefined
  return false;
}

// ==========================================
// UPDATED LOGIN LOGIC
// ==========================================

// In checkBatchCode() function, replace this:
// if (batchMember.is_approved !== true) {
//   showError('Waiting for batch admin approval');
//   return;
// }

// With this:
if (!isBatchMemberApproved(batchMember.is_approved)) {
  showError('Waiting for batch admin approval');
  return;
}

// ==========================================
// DETAILED EXAMPLE FOR login_fixed.html
// ==========================================

// Update the checkBatchCode function to:

async function checkBatchCode() {
  const batchCode = document.getElementById('batchCode').value.trim();
  hideError();

  console.log('Checking batch code:', batchCode);

  if (!batchCode) {
    showError('Please enter Batch Code');
    return;
  }

  try {
    // Check if batch code exists
    const { data: batch, error } = await db
      .from('batches')
      .select('id, batch_code, college_name, batch_name')
      .eq('batch_code', batchCode.toUpperCase())
      .single();

    console.log('Batch result:', batch, error);

    if (error || !batch) {
      showError('Invalid Batch Code');
      return;
    }

    // Check if student is approved in this batch
    const { data: batchMember, error: memberErr } = await db
      .from('batch_members')
      .select('is_approved')
      .eq('batch_id', batch.id)
      .eq('student_id', studentData.id)
      .single();

    console.log('Batch member result:', batchMember, memberErr);

    if (memberErr || !batchMember) {
      showError('You are not approved for this batch');
      return;
    }

    // ✅ USE THIS FUNCTION - Handles both TEXT and BOOLEAN
    if (!isBatchMemberApproved(batchMember.is_approved)) {
      showError('Waiting for batch admin approval');
      console.log('User not approved. is_approved value:', batchMember.is_approved);
      return;
    }

    // Store batch info
    selectedBatch = {
      batchId: batch.id,
      batchName: batch.batch_name,
      collegeName: batch.college_name
    };

    localStorage.setItem('selectedBatch', JSON.stringify(selectedBatch));

    showStep('loginStep3');
  } catch (err) {
    console.error('Error:', err);
    showError('Error checking batch code: ' + err.message);
  }
}

// ==========================================
// DATA TYPES EXPLANATION
// ==========================================

/*
is_approved can be:

1. BOOLEAN (Recommended):
   - true  = Approved ✅
   - false = Not approved ❌
   - NULL  = Not reviewed yet

2. TEXT (Current in your DB):
   - 'true'  = Approved ✅
   - 'false' = Not approved ❌
   - NULL    = Not reviewed yet

The function isBatchMemberApproved() handles BOTH types!

Examples:
- is_approved = true        → return true ✅
- is_approved = 'true'      → return true ✅
- is_approved = false       → return false ❌
- is_approved = 'false'     → return false ❌
- is_approved = NULL        → return false ❌
- is_approved = undefined   → return false ❌
*/
