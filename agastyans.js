const chatBox = document.getElementById("chatBox")

loadMessages()


function sendMessage(){

const input=document.getElementById("msgInput")

if(input.value.trim()=="") return

const msg={
type:"text",
text:input.value,
time:Date.now()
}

saveMessage(msg)

input.value=""

loadMessages()

}


function sendGIF(){

const gif=prompt("Paste GIF link")

if(!gif) return

const msg={
type:"gif",
url:gif,
time:Date.now()
}

saveMessage(msg)

loadMessages()

}


function createPoll(){

const q=prompt("Poll Question")

const o1=prompt("Option 1")

const o2=prompt("Option 2")

if(!q) return

const poll={
type:"poll",
question:q,
options:[o1,o2],
votes:[0,0],
id:Date.now(),
time:Date.now()
}

saveMessage(poll)

loadMessages()

}


function vote(id,opt){

let msgs=JSON.parse(localStorage.getItem("agastyansMsgs"))||[]

msgs.forEach(m=>{
if(m.id==id){
m.votes[opt]++
}
})

localStorage.setItem("agastyansMsgs",JSON.stringify(msgs))

loadMessages()

}


function saveMessage(msg){

let msgs=JSON.parse(localStorage.getItem("agastyansMsgs"))||[]

msgs.push(msg)

localStorage.setItem("agastyansMsgs",JSON.stringify(msgs))

}


function loadMessages(){

chatBox.innerHTML=""

let msgs=JSON.parse(localStorage.getItem("agastyansMsgs"))||[]

const now=Date.now()

/* AUTO DELETE AFTER 10 HOURS */

msgs=msgs.filter(m=> now-m.time < 36000000)

localStorage.setItem("agastyansMsgs",JSON.stringify(msgs))

msgs.forEach(m=>{

const div=document.createElement("div")

div.className="message"

if(m.type=="text"){
div.innerHTML=m.text
}

if(m.type=="gif"){
div.innerHTML=`<img src="${m.url}">`
}

if(m.type=="poll"){

div.innerHTML=`
<div class="poll">
<p>${m.question}</p>

<button onclick="vote(${m.id},0)">
${m.options[0]} (${m.votes[0]})
</button>

<button onclick="vote(${m.id},1)">
${m.options[1]} (${m.votes[1]})
</button>

</div>
`

}

chatBox.appendChild(div)

})

}


/* NAVIGATION */

function goBack(){

history.back()

}


/* LOGOUT */

function logout(){

alert("Logged out")

window.location.href="login.html"

}
