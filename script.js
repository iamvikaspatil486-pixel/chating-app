// 🔹 CONFIGURATION
const SUPABASE_URL = "https://ntfglwfrhljjkzecifuh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Keep your key here
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Select elements
const loginBtn = document.querySelector(".login");
const githubBtn = document.querySelector(".github-login"); // Add this to your HTML

// 1. LOGIN WITH GITHUB
async function signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            // This is where GitHub sends the user back after clicking "Authorize"
            redirectTo: window.location.origin + '/index.html', 
        }
    });

    if (error) {
        alert("Error connecting to GitHub: " + error.message);
    }
}

// 2. SIGN UP WITH EMAIL + STORE NAME
// Note: This requires a 'name' input field in your HTML
async function handleSignUp() {
    const email = document.getElementById("email").value;
    const fullName = document.getElementById("name").value; // Added name field

    if (!email || !fullName) {
        alert("Please enter both email and name");
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: "temporary123", // Ideally, let users pick a password
        options: {
            data: {
                full_name: fullName,
                display_name: fullName.split(' ')[0]
            }
        }
    });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Check your email for the confirmation link!");
    }
}

// 3. CHECK AUTH STATUS ON LOAD
window.addEventListener("load", async () => {
    // Small welcome animation
    const card = document.querySelector(".card");
    if (card) {
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";
        setTimeout(() => {
            card.style.transition = "0.5s";
            card.style.transform = "scale(1)";
            card.style.opacity = "1";
        }, 100);
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        console.log("Welcome back,", user.user_metadata.full_name || user.email);
        // Optional: Redirect to a dashboard if already logged in
    }
});

// Event Listeners
if (githubBtn) githubBtn.addEventListener("click", signInWithGitHub);

// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").then(() => {
        console.log("Service Worker Registered");
    });
}
