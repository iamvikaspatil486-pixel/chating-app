async function requireAuth(){

const { data } = await db.auth.getSession();

if(!data.session){
window.location.href="login.html";
return;
}

// logged user info
const user = data.session.user;
console.log("Logged user:", user.email);

}

// run after page fully loads
window.addEventListener("load", requireAuth);


// logout function
async function logout(){

await db.auth.signOut();
window.location.href="login.html";

}
