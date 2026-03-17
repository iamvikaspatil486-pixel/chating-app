// username.js

const customInput = document.getElementById("custom-name");
const enterBtn = document.getElementById("enterBtn");
const msg = document.getElementById("msg");

// Check if user already has a temporary username
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

// Handle suggestion buttons
window.selectName = async function(name) {
    customInput.value = name;
};

// Utility: generate unique username if duplicate in last 10 hours
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

// Handle Enter Chat
enterBtn.addEventListener("click", async () => {
    let username = customInput.value.trim();

    if (username.length < 3) {
        msg.innerText = "Username must be at least 3 characters";
        return;
    }

    username = await generateUniqueUsername(username);

    const anonUser = {
        name: username,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };

    localStorage.setItem("anon_user", JSON.stringify(anonUser));

    // Redirect to chat page
    window.location.href = "chat.html";
});
