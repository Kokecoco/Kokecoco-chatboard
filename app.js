import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMZVVnHmuA4j8Pi-hrlQsc2INHD-OeW-8",
  authDomain: "kokecoco-keijiban.firebaseapp.com",
  projectId: "kokecoco-keijiban",
  storageBucket: "kokecoco-keijiban.appspot.com",
  messagingSenderId: "309231948411",
  appId: "1:309231948411:web:7c92acd787da3a943a88de",
  measurementId: "G-JTD32GCZY9",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameDisplay = document.getElementById("user-name");
const newPostForm = document.getElementById("new-post-form");
const postTitleInput = document.getElementById("post-title");
const postContentInput = document.getElementById("post-content");
const postTagsInput = document.getElementById("post-tags");
const postsContainer = document.getElementById("posts-container");

let currentUser = null;

// 状態の変更を監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    // ドメインチェック
    const allowedEmails = ["kaede.w0918@gmail.com"];
    const allowedDomain = "gll-kaisei-s.sapporo-c.ed.jp";
    const emailDomain = user.email.split("@")[1];
    if (emailDomain !== allowedDomain && !allowedEmails.includes(user.email)) {
      alert(`許可されていないドメイン: ${emailDomain}`);
      signOut(auth);
      return;
    }
    currentUser = user;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userNameDisplay.textContent = user.displayName || "匿名";
    loadPosts();
  } else {
    currentUser = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userNameDisplay.textContent = "";
    postsContainer.innerHTML = "<p>ログインしてください。</p>";
  }
});

// Google ログインボタンのクリックイベント
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("ログインエラー:", error);
  }
});

// ログアウトボタンのクリックイベント
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("ログアウトエラー:", error);
  }
});

// 新規投稿フォームの送信イベント
newPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert("ログインしてください。");
    return;
  }

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  const tags = postTagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);

  if (title === "" || content === "") {
    alert("タイトルと内容は必須です。");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      title,
      content,
      author: currentUser.displayName || "匿名",
      uid: currentUser.uid,
      tags,
      timestamp: serverTimestamp(),
      likes: 0,
    });

    postTitleInput.value = "";
    postContentInput.value = "";
    postTagsInput.value = "";
  } catch (error) {
    console.error("投稿エラー:", error);
  }
});

// 投稿の読み込み
// 投稿の読み込み
function loadPosts() {
  const postsRef = collection(db, "posts");
  const postsQuery = query(postsRef, orderBy("timestamp", "desc"));

  onSnapshot(
    postsQuery,
    (snapshot) => {
      postsContainer.innerHTML = "";
      snapshot.forEach((docref) => {
        const post = docref.data();
        const postElement = document.createElement("div");
        postElement.classList.add("post");
        postElement.innerHTML = `
        <div class="title">${post.title}</div>
        <div class="author">${post.author}</div>
        <div class="content">${post.content}</div>
        <div class="tags">${post.tags.map((tag) => `#${tag}`).join(" ")}</div>
        <div class="timestamp">${post.timestamp.toDate().toLocaleString()}</div>
        <div class="like-count">いいね: ${post.likes}</div>
        <button class="like-btn">いいね</button>
        ${
          currentUser && currentUser.uid === post.uid
            ? `
          <button class="edit-btn">編集</button>
          <button class="delete-btn">削除</button>
        `
            : ""
        }
      `;

        // いいねボタンのイベント
        const likeBtn = postElement.querySelector(".like-btn");
        likeBtn.addEventListener("click", async () => {
          try {
            await updateDoc(doc(db, "posts", docref.id), {
              likes: post.likes + 1,
            });
          } catch (error) {
            console.error("いいねエラー:", error);
          }
        });

        // 編集ボタンのイベント
        const editBtn = postElement.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.addEventListener("click", async () => {
            const newTitle = prompt("新しいタイトル:", post.title);
            const newContent = prompt("新しい内容:", post.content);
            const newTags = prompt(
              "新しいタグ（カンマで区切ってください）:",
              post.tags.join(", "),
            );

            if (newTitle && newContent) {
              try {
                await updateDoc(doc(db, "posts", docref.id), {
                  title: newTitle,
                  content: newContent,
                  tags: newTags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag),
                });
              } catch (error) {
                console.error("編集エラー:", error);
              }
            }
          });
        }

        // 削除ボタンのイベント
        const deleteBtn = postElement.querySelector(".delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            if (confirm("この投稿を削除しますか？")) {
              try {
                const postRef = doc(db, "posts", docref.id); // 修正: ドキュメント参照を取得
                await deleteDoc(postRef);
                console.log("投稿が削除されました");
              } catch (error) {
                console.error("削除エラー:", error);
              }
            }
          });
        }

        postsContainer.appendChild(postElement);
      });
    },
    (error) => {
      console.error("データ取得エラー:", error);
    },
  );
}
