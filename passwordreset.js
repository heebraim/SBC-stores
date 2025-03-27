
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

    document.getElementById('sendReset').addEventListener('click', async () => {
      const email = document.getElementById('resetEmail').value.trim();
      
      if (!email) {
        alert('Please enter your email address');
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Check your inbox.');
        window.location.href = 'Login.html';
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });

