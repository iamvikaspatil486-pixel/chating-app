const TEN_HOURS = 10 * 60 * 60 * 1000

let selectedName = null

// suggested name click
function selectName(name){
document.getElementById("custom-name").value = name
}

// check existing username
const stored = JSON.parse(localStorage.getItem("anon_user"))

if(stored){

const age = Date.now() - stored.time

if(age < TEN_HOURS){

if(confirm("Continue with existing username: "+stored.name+" ?")){

window.location.href="chat.html"
}else{

localStorage.removeItem("anon_user")

}

}else{

localStorage.removeItem("anon_user")

}

}

// join button
document.getElementById("enterBtn").onclick = async () => {

let username =
document.getElementById("custom-name").value.trim()

if(username.length < 3){

document.getElementById("msg").innerText="Username too short"
return

}

await createUniqueUsername(username)

}

async function createUniqueUsername(baseName){

// check existing usernames
const { data } = await db
.from("online_users")
.select("username")
.ilike("username", baseName+"%")

let finalName = baseName

if(data && data.length > 0){

finalName = baseName + "_" + (data.length+1)

}

const userId = crypto.randomUUID()

// save to supabase
await db.from("online_users").insert({

user_id:userId,
username:finalName,
last_seen:new Date()

})

localStorage.setItem("anon_user",JSON.stringify({

name:finalName,
id:userId,
time:Date.now()

}))

window.location.href="chat.html"

}
