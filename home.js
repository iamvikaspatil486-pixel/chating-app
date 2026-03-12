async function loadPosts(){

const { data:posts, error } = await db
.from("posts")
.select(`
id,
caption,
students(nickname,full_name),
post_images(image_url,position)
`)
.order("created_at",{ascending:false});

if(!posts || posts.length===0){
document.getElementById("noPosts").style.display="block";
return;
}

const feed=document.querySelector("main");
document.getElementById("noPosts").style.display="none";

posts.forEach(post=>{

let images="";

post.post_images.forEach(img=>{
images+=`<img src="${img.image_url}" class="w-full snap-center"/>`
})

const card=`
<div class="bg-slate-800 rounded-2xl overflow-hidden">

<div class="flex items-center gap-3 p-3">
<div class="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
${post.students.nickname[0]}
</div>

<div>
<p class="text-sm font-bold text-cyan-400">@${post.students.nickname}</p>
<p class="text-xs text-slate-400">${post.students.full_name}</p>
</div>
</div>

<div class="flex overflow-x-auto snap-x">
${images}
</div>

<div class="p-3 text-sm text-slate-200">
${post.caption}
</div>

<div class="flex justify-between items-center p-3 border-t border-slate-700">

<div class="flex gap-4">

<button class="flex items-center gap-1 text-slate-400 hover:text-red-400">
<i data-lucide="heart"></i>
<span class="text-xs">Like</span>
</button>

<button class="flex items-center gap-1 text-slate-400 hover:text-blue-400">
<i data-lucide="message-circle"></i>
<span class="text-xs">Comment</span>
</button>

</div>

</div>

</div>
`;

feed.insertAdjacentHTML("afterbegin",card);

})

lucide.createIcons();

}

loadPosts();
