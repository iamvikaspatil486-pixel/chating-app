window.onerror = function(message, source, lineno) {
  alert("Error: " + message + " at line " + lineno);
};

// ---------------- ELEMENTS ----------------
const msgContainer = document.getElementById("messages-container");
const msgInput = document.getElementById("msg-input");

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const errorMsg = document.getElementById("error-msg");

const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");

const imageBtn = document.getElementById("image-btn");
const imageInput = document.getElementById("image-input");

const pollBtn = document.getElementById("poll-btn");
const pollCreator = document.getElementById("poll-creator");
const createPollBtn = document.getElementById("create-poll");
const cancelPollBtn = document.getElementById("cancel-poll");

const onlineCount = document.getElementById("online-count");


// ---------------- USER SESSION ----------------
let myUsername = sessionStorage.getItem("temp_user") || "";
let myUserId = sessionStorage.getItem("temp_id") || crypto.randomUUID();


// ---------------- NAME SUGGESTION ----------------
window.fillName = function(name){
  document.getElementById("username-input").value = name;
}
const joinBtn = document.getElementById("join-btn");

joinBtn.addEventListener("click", () => {

const usernameInput = document.getElementById("username-input");
const username = usernameInput.value.trim();

if(username.length < 3){
document.getElementById("error-msg").innerText =
"Username must be at least 3 characters";
return;
}

myUsername = username;

sessionStorage.setItem("temp_user", myUsername);
sessionStorage.setItem("temp_id", myUserId);

// show chat
document.getElementById("login-screen").classList.add("hidden");
document.getElementById("chat-screen").classList.remove("hidden");

// show name in header
document.getElementById("display-name").innerText = myUsername;

});


// ---------------- PAGE LOAD ----------------
window.addEventListener("DOMContentLoaded", () => {

  if(myUsername){
    showChat();
  }

});


// ---------------- SHOW CHAT ----------------
function showChat(){

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  initRealtime();
  loadMessages();
  loadPolls();

  updateOnline();
  setInterval(updateOnline, 60000);

}


// ---------------- JOIN CHAT ----------------
joinBtn.addEventListener("click", async ()=>{

  const inputName = document.getElementById("username-input").value.trim();

  if(!inputName){
    errorMsg.innerText="Please enter username";
    return;
  }

  myUsername = inputName;

  sessionStorage.setItem("temp_user", myUsername);
  sessionStorage.setItem("temp_id", myUserId);

  showChat();

});


// ---------------- LOAD MESSAGES ----------------
async function loadMessages(){

  const tenHoursAgo = new Date(Date.now()-10*60*60*1000).toISOString();

  const {data,error} = await db
  .from("chat_messages")
  .select("*")
  .gt("created_at",tenHoursAgo)
  .order("created_at",{ascending:true});

  if(error){
    console.log(error);
    return;
  }

  msgContainer.innerHTML="";

  data.forEach(msg=>{
    renderMessage(msg);
  });

}


// ---------------- LOAD POLLS ----------------
async function loadPolls(){

  const tenHoursAgo = new Date(Date.now()-10*60*60*1000).toISOString();

  const {data,error}=await db
  .from("polls")
  .select("*")
  .gt("created_at",tenHoursAgo)
  .order("created_at",{ascending:true});

  if(error){
    console.log(error);
    return;
  }

  data.forEach(p=>{
    renderPoll(p);
  });

}


// ---------------- REALTIME ----------------
function initRealtime(){

  db.channel("chat_messages")
  .on("postgres_changes",
  {
    event:"INSERT",
    schema:"public",
    table:"chat_messages"
  },
  payload=>{
    renderMessage(payload.new);
  })
  .subscribe();


  db.channel("polls")
  .on("postgres_changes",
  {
    event:"INSERT",
    schema:"public",
    table:"polls"
  },
  payload=>{
    renderPoll(payload.new);
  })
  .subscribe();

}


// ---------------- SEND MESSAGE ----------------
async function sendMessage(){

  const text = msgInput.value.trim();

  if(!text) return;

  const {error}=await db
  .from("chat_messages")
  .insert([
    {
      username:myUsername,
      user_id:myUserId,
      message:text
    }
  ]);

  if(error){
    console.log(error);
  }

  msgInput.value="";

}


// ---------------- IMAGE MESSAGE ----------------
imageBtn.addEventListener("click",()=>{
  imageInput.click();
});

imageInput.addEventListener("change",async()=>{

  const file=imageInput.files[0];

  if(!file) return;

  const fileName=Date.now()+"_"+file.name;

  const {error:uploadError}=await db.storage
  .from("chat-media")
  .upload(fileName,file);

  if(uploadError){
    console.log(uploadError);
    return;
  }

  const {data}=db.storage
  .from("chat-media")
  .getPublicUrl(fileName);

  await db.from("chat_messages").insert([
    {
      username:myUsername,
      user_id:myUserId,
      media_url:data.publicUrl
    }
  ]);

});


// ---------------- RENDER MESSAGE ----------------
function renderMessage(msg){

  const div=document.createElement("div");

  const isMe=msg.username===myUsername;

  div.className="msg-bubble "+(isMe?"me":"");

  let content="";

  if(msg.media_url){

    content=`<img src="${msg.media_url}" class="chat-media">`;

  }else if(msg.voice_url){

    content=`<audio controls src="${msg.voice_url}"></audio>`;

  }else{

    content=`<span class="text">${msg.message}</span>`;

  }

  div.innerHTML=`
  <span class="user-label">${isMe?"You":msg.username}</span>
  ${content}
  `;

  msgContainer.appendChild(div);

  msgContainer.scrollTop=msgContainer.scrollHeight;

}


// ---------------- CREATE POLL ----------------
pollBtn.addEventListener("click",()=>{
  pollCreator.classList.remove("hidden");
});

cancelPollBtn.addEventListener("click",()=>{
  pollCreator.classList.add("hidden");
});


createPollBtn.addEventListener("click",async()=>{

  const question=document.getElementById("poll-question").value;

  const opts=document.querySelectorAll(".poll-option");

  const option1=opts[0].value;
  const option2=opts[1].value;
  const option3=opts[2].value;
  const option4=opts[3].value;

  if(!question || !option1 || !option2){
    alert("Minimum 2 options required");
    return;
  }

  await db.from("polls").insert([
    {
      question:question,
      option1:option1,
      option2:option2,
      option3:option3,
      option4:option4,
      user_id:myUserId
    }
  ]);

  pollCreator.classList.add("hidden");

});


// ---------------- RENDER POLL ----------------
function renderPoll(p){

  const div=document.createElement("div");

  div.className="poll-box";

  div.innerHTML=`
  <div class="poll-question">${p.question}</div>

  <button onclick="votePoll('${p.id}',0)">${p.option1}</button>
  <button onclick="votePoll('${p.id}',1)">${p.option2}</button>
  ${p.option3?`<button onclick="votePoll('${p.id}',2)">${p.option3}</button>`:""}
  ${p.option4?`<button onclick="votePoll('${p.id}',3)">${p.option4}</button>`:""}
  `;

  msgContainer.appendChild(div);

}


// ---------------- POLL VOTE ----------------
window.votePoll = async function(pollId,index){

  await db.from("poll_votes").insert([
    {
      poll_id:pollId,
      user_id:myUserId,
      option_index:index
    }
  ]);

};


// ---------------- ONLINE USERS ----------------
async function updateOnline(){

  await db.from("online_users").upsert([
    {
      username:myUsername,
      user_id:myUserId,
      last_seen:new Date()
    }
  ]);

  const twoMinAgo=new Date(Date.now()-120000).toISOString();

  const {data}=await db
  .from("online_users")
  .select("*")
  .gt("last_seen",twoMinAgo);

  if(data){
    onlineCount.innerText=data.length+" students online";
  }

}


// ---------------- EVENTS ----------------
sendBtn.addEventListener("click",sendMessage);

msgInput.addEventListener("keypress",(e)=>{
  if(e.key==="Enter"){
    sendMessage();
  }
});
// ANDROID KEYBOARD FIX

const inputBar = document.querySelector(".input-area")
const msgInput = document.getElementById("msg-input")

msgInput.addEventListener("focus", () => {

setTimeout(() => {
document.getElementById("messages-container")
.scrollIntoView({ behavior:"smooth", block:"end" })
},300)

})

msgInput.addEventListener("blur", () => {

setTimeout(() => {
window.scrollTo(0,0)
},200)

})
const panel = document.getElementById("dev-panel");
const consoleBox = document.getElementById("dev-console");

let tapCount = 0;

document.body.addEventListener("click", () => {
tapCount++;

if(tapCount === 3){
panel.style.display =
panel.style.display === "flex" ? "none" : "flex";

panel.style.display = "flex";
tapCount = 0;
}

setTimeout(()=> tapCount = 0, 1000);
});

window.onerror = function(msg,src,line){
consoleBox.innerHTML += "<div>ERROR: "+msg+" (line "+line+")</div>";
};

const oldLog = console.log;

console.log = function(msg){
consoleBox.innerHTML += "<div>"+msg+"</div>";
oldLog(msg);
};

document.getElementById("dev-run").onclick = () => {

const code = document.getElementById("dev-input").value;

try{
const result = eval(code);
consoleBox.innerHTML += "<div>> "+result+"</div>";
}
catch(e){
consoleBox.innerHTML += "<div>JS ERROR</div>";
}

};
