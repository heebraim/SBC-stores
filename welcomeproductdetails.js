
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { 
      getAuth, 
      onAuthStateChanged 
    } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
    import { 
      getFirestore,
      doc,
      getDoc
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
    let currentProduct = null;

    // Auth Modal Handling
    function showAuthModal() {
      document.getElementById('authModal').style.display = 'block';
      document.getElementById('modalOverlay').style.display = 'block';
    }

    function closeAuthModal() {
      document.getElementById('authModal').style.display = 'none';
      document.getElementById('modalOverlay').style.display = 'none';
    }

    document.getElementById('modalOverlay').addEventListener('click', closeAuthModal);
    document.getElementById('add-to-cart').addEventListener('click', showAuthModal);

    // Load Product
    async function loadProduct() {
      const productId = new URLSearchParams(window.location.search).get('id');
      if (!productId) window.location.href = 'index.html';

      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          currentProduct = productSnap.data();
          document.getElementById('product-img').src = currentProduct.imageUrl;
          document.getElementById('product-name').textContent = currentProduct.name;
          document.getElementById('product-price').textContent = `₦${currentProduct.price.toFixed(2)}`;
          document.getElementById('product-description').textContent = 
            currentProduct.description || 'No description available';
        }
      } catch (error) {
        console.error('Error loading product:', error);
        window.location.href = 'index.html';
      }
    }

    loadProduct();

