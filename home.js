const feed = document.getElementById("feed")
const noPosts = document.getElementById("noPosts")

document.addEventListener("DOMContentLoaded", () => {
    loadPosts()
})

async function loadPosts() {
    console.log("Loading posts...")

    const { data: posts, error } = await db
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching posts:", error)
        noPosts.innerText = "Error loading posts"
        return
    }

    if (!posts || posts.length === 0) {
        noPosts.style.display = "block"
        return
    }

    noPosts.style.display = "none"
    console.log("Posts fetched:", posts)

    for (const post of posts) {
        const { data: images } = await db
            .from("post_images")
            .select("*")
            .eq("post_id", post.id)
            .order("position")

        const imageUrl = images?.[0]?.image_url || ""

        const { data: likes } = await db
            .from("likes")
            .select("*")
            .eq("post_id", post.id)

        const likeCount = likes.length

        const nickname = post.nickname || post.full_name
        const fullName = post.full_name || ""
        const letter = nickname.charAt(0).toUpperCase()

        const card = document.createElement("div")
        card.className = "bg-slate-800 rounded-2xl overflow-hidden"

        card.innerHTML = `
        <div class="flex items-center gap-3 p-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
                ${letter}
            </div>
            <div>
                <p class="text-sm font-bold text-cyan-400">@${nickname}</p>
                <p class="text-xs text-slate-400">${fullName}</p>
            </div>
        </div>

        <img src="${imageUrl}" onclick="openImage('${imageUrl}')" class="w-full aspect-square object-cover">

        <div class="p-3 text-sm text-slate-200">
            ${post.caption || ""}
        </div>

        <div class="flex justify-between items-center p-3 border-t border-slate-700">
            <div class="flex gap-4 items-center">
                <button onclick="likePost('${post.id}')" class="text-slate-400 hover:text-red-400">
                    <i data-lucide="heart"></i>
                </button>
                <span id="likes-${post.id}" class="text-xs">${likeCount}</span>
                <button onclick="openComments('${post.id}')" class="text-slate-400 hover:text-blue-400">
                    <i data-lucide="message-circle"></i>
                </button>
            </div>
            <button onclick="deletePost('${post.id}','${post.user_id}')" class="text-red-400">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
        `

        feed.appendChild(card)
    }

    lucide.createIcons()
}
