// ---------------- DOM ELEMENTS ----------------
const enterBtn = document.getElementById("enterBtn");
const customInput = document.getElementById("custom-name");
const msg = document.getElementById("msg");

// ---------------- LOCAL STORAGE KEYS ----------------
const USER_KEY = "anon_user";

// ---------------- HELPER FUNCTIONS ----------------

// Select a suggested name
window.selectName = function(name) {
    customInput.value = name;
};

// Generate unique username if duplicate exists
async function generateUniqueUsername(baseName) {
    // Get all existing users from localStorage
    let existing = JSON.parse(localStorage.getItem("online_users") || "[]");

    let uniqueName = baseName;
    let counter = 1;
    while (existing.includes(uniqueName)) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
    }

    // Add to existing list
    existing.push(uniqueName);
    localStorage.setItem("online_users", JSON.stringify(existing));

    return uniqueName;
}

// Check for existing username with expiry
function checkExistingUser() {
    const stored = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (stored) {
        const now = Date.now();
        if (now - stored.timestamp < 10 * 60 * 60 * 1000) {
            const cont = confirm(`Continue with username "${stored.name}"?`);
            if (cont) {
                window.location.href = "chat.html";
                return true;
            } else {
                // ✅ Warn before allowing new username
                const understood = confirm(
                  `⚠️ Warning!\n\nIf you create a new username, you will NOT be able to edit or delete messages sent by "${stored.name}".\n\nDo you still want to change your username?`
                )
                if (!understood) {
                  // User changed mind — go to chat with old username
                  window.location.href = "chat.html"
                  return true
                }
                // User confirmed — remove old username and let them pick new one
                localStorage.removeItem(USER_KEY)
            }
        }
    }
    return false;
}
// ---------------- MAIN ----------------
if (!checkExistingUser()) {
    enterBtn.addEventListener("click", async () => {
        let username = customInput.value.trim();

        if (username.length < 3) {
            msg.innerText = "Username must be at least 3 characters";
            return;
        }

        username = await generateUniqueUsername(username);

        const anonUser = {
            name: username,
            timestamp: Date.now()
        };

        localStorage.setItem(USER_KEY, JSON.stringify(anonUser));

        // Redirect to chat page
        window.location.href = "chat.html";
    });
}
