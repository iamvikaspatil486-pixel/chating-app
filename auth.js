async function requireAuth(){

const { data } = await db.auth.getSession();

if(!data.session){
window.location.href="login.html";
return;
}

// optional: get logged user
const user = data.session.user;
console.log("Logged user:", user.email);

}

// run when page loads
document.addEventListener("DOMContentLoaded", requireAuth);


// logout function
async function logout(){

await db.auth.signOut();
window.location.href="login.html";

}
