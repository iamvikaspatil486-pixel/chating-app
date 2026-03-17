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
        // 10 hours = 10 * 60 * 60 * 1000 ms
        if (now - stored.timestamp < 10 * 60 * 60 * 1000) {
            // Ask user if they want to continue
            const cont = confirm(`Continue with username "${stored.name}"?`);
            if (cont) {
                window.location.href = "chat.html";
                return true;
            } else {
                localStorage.removeItem(USER_KEY);
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
