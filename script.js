// 🔹 REPLACE WITH YOUR OWN
const SUPABASE_URL = "ntfglwfrhljjkzecifuh";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// LOGIN FUNCTION
async function login() {
  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;

  if (!name || !age) {
    alert("Please enter name and age");
    return;
  }

  // Insert student into your table
  await supabase.from("students").insert([
    { name: name, age: age }
  ]);

  currentUser = name;

  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("chat-container").classList.remove("hidden");

  loadMessages();
  subscribeToMessages();
}

// LOAD MESSAGES
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  data.forEach(msg => {
    messagesDiv.innerHTML += `
      <div class="message">
        <strong>${msg.name}:</strong> ${msg.content}
      </div>
    `;
  });
}

// SEND MESSAGE
async function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value;

  if (!message) return;

  await supabase.from("messages").insert([
    {
      name: currentUser,
      content: message
    }
  ]);

  input.value = "";
}

// REAL-TIME SUBSCRIPTION
function subscribeToMessages() {
  supabase
    .channel('public:messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      payload => {
        const msg = payload.new;
        const messagesDiv = document.getElementById("messages");

        messagesDiv.innerHTML += `
          <div class="message">
            <strong>${msg.name}:</strong> ${msg.content}
          </div>
        `;
      }
    )
    .subscribe();
}

// LOGOUT
function logout() {
  currentUser = null;
  document.getElementById("chat-container").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
}
