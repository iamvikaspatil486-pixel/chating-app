const messagesDiv = document.getElementById("messages")
const input = document.getElementById("messageInput")

let username = localStorage.getItem("chatUsername")
let replyTo = null


window.onload=()=>{

if(!username){

document.getElementById("usernamePopup").style.display="flex"

}

subscribeMessages()

}



function saveUsername(){

let select=document.getElementById("usernameSelect").value
let custom=document.getElementById("customUsername").value

username=custom||select||"anon"

localStorage.setItem("chatUsername",username)

document.getElementById("usernamePopup").style.display="none"

}



document.getElementById("sendBtn").onclick=sendMessage



async function sendMessage(){

let text=input.value

if(!text) return

await db.from("messages").insert({

text:text,
username:username,
reply_to:replyTo

})

input.value=""
replyTo=null

}



function renderMessage(m){

let div=document.createElement("div")

div.className="message"

div.innerHTML=

"<b>"+m.username+"</b><br>"+m.text+
"<div class='reactions'>❤️ 😂 🔥 👍</div>"



let startX

div.addEventListener("touchstart",e=>{

startX=e.touches[0].clientX

})

div.addEventListener("touchend",e=>{

let endX=e.changedTouches[0].clientX

if(endX-startX>80){

replyTo=m.text

document.getElementById("replyText").innerText="Reply: "+m.text

document.getElementById("replyBox").classList.remove("hidden")

}

})



messagesDiv.appendChild(div)

messagesDiv.scrollTop=messagesDiv.scrollHeight

}



function cancelReply(){

replyTo=null

document.getElementById("replyBox").classList.add("hidden")

}



function subscribeMessages(){

db.channel("chat")

.on(

"postgres_changes",

{event:"INSERT",schema:"public",table:"messages"},

payload=>{

renderMessage(payload.new)

}

)

.subscribe()

}



input.addEventListener("input",()=>{

document.getElementById("typingIndicator").classList.remove("hidden")

setTimeout(()=>{

document.getElementById("typingIndicator").classList.add("hidden")

},1500)

})



document.getElementById("logout").onclick=async()=>{

await db.auth.signOut()

location.href="login.html"

}
