// username.js

const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const errorMsg = document.getElementById("error-msg");
const suggestions = document.querySelectorAll(".badge");

// Check if a username already exists in localStorage
let anonUser = JSON.parse(localStorage.getItem("anon_user"));

if (anonUser) {
    const continueChoice = confirm(
        `Continue as "${anonUser.name}"? Click Cancel to pick a new username.`
    );
    if (continueChoice) {
        window.location.href = "chat.html";
    } else {
        localStorage.removeItem("anon_user");
    }
}

// Fill input when suggestion clicked
window.fillName = function(name) {
    usernameInput.value = name;
};

// Utility: generate a unique username if duplicate
async function generateUniqueUsername(baseName) {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    const { data: existing, error } = await db
        .from("chat_messages")
        .select("username")
        .gt("created_at", tenHoursAgo)
        .like("username", `${baseName}%`);

    if (error) {
        console.error(error);
        return baseName;
    }

    if (!existing || existing.length === 0) return baseName;

    // Find next available number
    let maxNum = 0;
    existing.forEach(e => {
        const match = e.username.match(new RegExp(`${baseName}_(\\d+)$`));
        if (match) {
            const n = parseInt(match[1]);
            if (n > maxNum) maxNum = n;
        }
    });

    return `${baseName}_${maxNum + 1}`;
}

// Handle join button
joinBtn.addEventListener("click", async () => {
    let username = usernameInput.value.trim();

    if (username.length < 3) {
        errorMsg.innerText = "Username must be at least 3 characters";
        return;
    }

    username = await generateUniqueUsername(username);

    const anonUser = {
        name: username,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };

    localStorage.setItem("anon_user", JSON.stringify(anonUser));

    // Redirect to chat
    window.location.href = "chat.html";
});
