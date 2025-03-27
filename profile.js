
// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
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

// Initialize Loader
const loaderText = "SBC-Stores";
const loaderElement = document.getElementById("loader");

loaderText.split("").forEach((char, index) => {
  const span = document.createElement("span");
  span.textContent = char;
  span.style.setProperty('--i', index);
  span.style.animationDelay = `${index * 0.2}s`;
  loaderElement.appendChild(span);
});

// Image Overlay Handling
const profileImg = document.getElementById('profileImg');
const imageOverlay = document.getElementById('imageOverlay');

profileImg.addEventListener('click', () => {
  imageOverlay.style.display = 'flex';
  imageOverlay.querySelector('img').src = profileImg.src;
});

imageOverlay.addEventListener('click', () => {
  imageOverlay.style.display = 'none';
});

// Back Button Functionality
document.getElementById('backButton').addEventListener('click', () => {
  window.history.back() || (window.location.href = 'landing.html');
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'method.html';
  } catch (error) {
    alert('Error logging out: ' + error.message);
  }
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = 'method.html';
  
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data() || {};

    // Update Profile Data
    document.getElementById('firstName').textContent = userData.firstName || 'Not provided';
    document.getElementById('lastName').textContent = userData.lastName || 'Not provided';
    document.getElementById('phone').textContent = userData.telephone || 'Not provided';
    document.getElementById('profileEmail').textContent = user.email;

    // Update Profile Image
    if (userData.profilePicture) {
      profileImg.src = userData.profilePicture;
    } else if (user.photoURL) {
      profileImg.src = user.photoURL;
    }
  } catch (error) {
    alert('Error loading profile: ' + error.message);
  } finally {
    // Hide Loader
    document.getElementById('loaderContainer').style.display = 'none';
  }
});

 // Orders Button Handler - Updated version
 document.getElementById('ordersBtn').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('You must be logged in to view orders.');

  try {
    console.log('Fetching orders for user:', user.uid);

    // Query orders collection for the user's uid, ordered by date
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      // orderBy("createdAt", "desc") // Uncomment if you want newest first
    );

    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = [];

    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      console.log('Order found:', doc.id, orderData);
      
      // Convert Firestore timestamp to Date if it exists
      let orderDate = 'Date not available';
      if (orderData.createdAt) {
        orderDate = orderData.createdAt.toDate().toLocaleString();
      } else if (orderData.createdAt?.seconds) {
        orderDate = new Date(orderData.createdAt.seconds * 1000).toLocaleString();
      }
      
      orders.push({ 
        id: doc.id, 
        ...orderData,
        formattedDate: orderDate
      });
    });

    if (orders.length === 0) {
      alert('No orders found for this account.');
    } else {
      // Display orders in the modal
      const ordersList = document.getElementById('ordersList');
      ordersList.innerHTML = orders.map(order => `
        <div class="order-item">
          <div class="order-item-header">
            <div>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Date:</strong> ${order.formattedDate}</p>
            </div>
            <div>
              <span class="order-status status-${order.status.toLowerCase()}">
                ${order.status}
              </span>
            </div>
          </div>
          
          <div class="order-item-details">
            <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>
            
            <h5>Items:</h5>
            ${order.items.map(item => `
              <div class="order-item-product">
                <span>${item.name} (${item.quantity}x)</span>
                <span>₦${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      // Show the modal
      document.getElementById('ordersModal').style.display = 'flex';
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    alert('Error fetching orders: ' + error.message);
  }
});

// Close Modal
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('ordersModal').style.display = 'none';
});

// Close Modal when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('ordersModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Camera Icon Functionality
document.getElementById('cameraIcon').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 100;
          const maxHeight = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          profileImg.src = base64;

          // Save to Firestore
          const user = auth.currentUser;
          if (user) {
            updateDoc(doc(db, "users", user.uid), {
              profilePicture: base64
            }).then(() => {
              alert('Profile picture updated successfully!');
            }).catch((error) => {
              alert('Error updating profile picture: ' + error.message);
            });
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
});

