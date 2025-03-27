
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

    document.getElementById("toggleLoginPassword").addEventListener("click", () => {
      const passwordField = document.getElementById("loginPassword");
      passwordField.type = passwordField.type === "password" ? "text" : "password";
    });

    document.getElementById("loginSubmit").addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
          showMessage("Please verify your email first", "error");
          await user.delete();
          return;
        }

        showMessage("Login successful!", "success", 1500);
        setTimeout(() => window.location.href = "landing.html", 1500);
      } catch (error) {
        showMessage(error.message);
      }
    });

    function showMessage(message, type = "error", duration = 3000) {
      const popup = document.getElementById("messagePopup");
      popup.textContent = message;
      popup.className = `message-popup ${type}`;
      popup.style.display = "block";
      if (duration) setTimeout(() => popup.style.display = "none", duration);
    }


