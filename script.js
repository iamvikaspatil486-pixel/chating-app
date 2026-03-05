// 🔹 REPLACE WITH YOUR OWN
const SUPABASE_URL = "ntfglwfrhljjkzecifuh";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zmdsd2ZyaGxqamt6ZWNpZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTEyNTYsImV4cCI6MjA4ODE2NzI1Nn0.xVC4IFBD72prT7KS-jiHlRQixVrR81QUVX2av_jU7uM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// LOGIN FUNCTION
async function loadStudents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('name');

  const list = document.getElementById("studentsList");

  data.forEach(student => {
    const li = document.createElement("li");
    li.textContent = student.name;
    list.appendChild(li);
  });
}

loadStudents();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
  .then(() => console.log("Service Worker Registered"));
}
  
