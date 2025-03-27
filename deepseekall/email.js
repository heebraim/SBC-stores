
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJvC26AJCiGOmjFD1CgG4Qc6kD72hl8qk",
  authDomain: "myecommercesite-d4f9b.firebaseapp.com",
  projectId: "myecommercesite-d4f9b",
  storageBucket: "myecommercesite-d4f9b.appspot.com",
  messagingSenderId: "330763504718",
  appId: "1:330763504718:web:d1c610bdf1bcf6f24f071f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const continueBtn = document.getElementById("continueBtn");
const messageEl = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");

continueBtn.addEventListener("click", () => {
  const email = document.getElementById("userEmail").value.trim();
  if (!email) {
    messageEl.textContent = "Please enter a valid email address.";
    return;
  }
  
  fetchSignInMethodsForEmail(auth, email)
    .then((methods) => {
      if (methods.length > 0) {
        messageEl.textContent = "Email exists. Login instead?";
        loginBtn.style.display = "block";
      } else {
        localStorage.setItem("tempEmail", email);
        window.location.href = "signup.html";
      }
    })
    .catch((error) => {
      messageEl.textContent = error.message;
    });
});

loginBtn.addEventListener("click", () => {
  localStorage.setItem("tempEmail", document.getElementById("userEmail").value.trim());
  window.location.href = "login.html";
});

