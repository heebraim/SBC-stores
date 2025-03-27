
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

// Form elements
const form = document.getElementById('signupForm');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const messagePopup = document.getElementById('messagePopup');

// Initialize email from localStorage
document.getElementById('email').value = localStorage.getItem('tempEmail') || '';

// Password visibility toggle
togglePassword.addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
});

// Show additional fields when password is entered
passwordInput.addEventListener('input', () => {
  document.getElementById('additionalFields').classList.toggle('hidden', passwordInput.value.length === 0);
});

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = passwordInput.value;
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const countryCode = document.getElementById('countryCode').value;
  const phone = document.getElementById('telephone').value.trim();
  const telephone = `${countryCode} ${phone}`;

  if (!validateForm()) return;

  try {
    // Create user in Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send verification email
    await sendEmailVerification(user);
    showVerificationPopup(user, firstName, lastName, telephone);

  } catch (error) {
    handleAuthError(error);
  }
});

function validateForm() {
  if (!document.getElementById('termsCheckbox').checked) {
    showMessage('Please accept the terms and conditions', 3000);
    return false;
  }
  return true;
}

function showVerificationPopup(user, firstName, lastName, telephone) {
  messagePopup.innerHTML = `
    <p>Verification email sent to ${user.email}</p>
    <div style="margin-top: 15px;">
      <button class="popup-btn" id="verifyBtn">I've Verified</button>
      <button class="popup-btn" id="cancelBtn">Cancel</button>
    </div>
  `;
  messagePopup.classList.add('success');
  messagePopup.style.display = 'block';

  // Verify button handler
  document.getElementById('verifyBtn').addEventListener('click', async () => {
    try {
      await user.reload();
      if (user.emailVerified) {
        // Save to Firestore after verification
        await setDoc(doc(db, 'users', user.uid), {
          firstName,
          lastName,
          email: user.email,
          telephone,
          createdAt: new Date()
        });
        window.location.href = 'landing.html';
      } else {
        await deleteUser(user);
        showMessage('Email not verified - account deleted', 5000);
        messagePopup.style.display = 'none';
      }
    } catch (error) {
      await deleteUser(user);
      showMessage(`Verification failed: ${error.message}`, 5000);
    }
  });

  // Cancel button handler
  document.getElementById('cancelBtn').addEventListener('click', async () => {
    try {
      await deleteUser(user);
      messagePopup.style.display = 'none';
      showMessage('Registration cancelled', 3000);
    } catch (error) {
      showMessage(`Error cancelling: ${error.message}`, 5000);
    }
  });
}

function handleAuthError(error) {
  let message = 'Registration failed: ';
  switch (error.code) {
    case 'auth/email-already-in-use':
      message += 'Email already registered';
      break;
    case 'auth/weak-password':
      message += 'Password must be at least 6 characters';
      break;
    case 'auth/invalid-email':
      message += 'Invalid email address';
      break;
    default:
      message += error.message;
  }
  showMessage(message, 5000);
}

function showMessage(text, duration = 3000) {
  messagePopup.textContent = text;
  messagePopup.style.display = 'block';
  setTimeout(() => messagePopup.style.display = 'none', duration);
}
