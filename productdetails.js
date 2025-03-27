
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { 
      getAuth, 
      onAuthStateChanged 
    } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
    import { 
      getFirestore,
      doc,
      getDoc,
      updateDoc,
      arrayUnion
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
    const MAX_CART_ITEMS = 90;
    
    let currentUser = null;
    let currentProduct = null;
    let currentQuantity = 1;

    // Back button functionality
   
    document.getElementById('backButton').addEventListener('click', () => {
        window.history.back() || (window.location.href = 'landing.html');
    });


    // Cart functionality
    async function updateCartCount() {
      try {
        const userCartRef = doc(db, "users", currentUser.uid);
        const cartSnap = await getDoc(userCartRef);
        const cart = cartSnap.exists() ? cartSnap.data().cart : [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCount').textContent = totalItems;
      } catch (error) {
        console.error('Error updating cart count:', error);
      }
    }

    // Quantity controls
    function setupQuantityControls() {
      document.getElementById('decrease-qty').addEventListener('click', () => {
        if (currentQuantity > 1) {
          currentQuantity--;
          updateQuantityDisplay();
        }
      });

      document.getElementById('increase-qty').addEventListener('click', () => {
        if (currentProduct && currentQuantity < currentProduct.stock) {
          currentQuantity++;
          updateQuantityDisplay();
        }
      });
    }

    function updateQuantityDisplay() {
      document.getElementById('quantity').textContent = currentQuantity;
      document.getElementById('increase-qty').disabled = 
        currentQuantity >= (currentProduct?.stock || 1);
    }

    // Product loading
    async function loadProduct() {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('id');
      
      if (!productId) {
        window.location.href = 'landing.html';
        return;
      }

      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          showError('Product not found');
          setTimeout(() => window.location.href = 'landing.html', 2000);
          return;
        }

        currentProduct = {
          id: productSnap.id,
          ...productSnap.data()
        };

        // Update UI
        document.getElementById('product-img').src = currentProduct.imageUrl;
        document.getElementById('product-name').textContent = currentProduct.name;
        document.getElementById('product-price').textContent = 
          `₦${currentProduct.price.toFixed(2)}`;
        document.getElementById('product-description').textContent = 
          currentProduct.description || 'No description available';

        // Update quantity controls
        updateQuantityDisplay();
        setupQuantityControls();

        // Setup add to cart button
        document.getElementById('add-to-cart').addEventListener('click', addToCart);
      } catch (error) {
        console.error('Error loading product:', error);
        showError('Failed to load product');
        setTimeout(() => window.location.href = 'landing.html', 2000);
      }
    }

    // Cart functionality
    async function addToCart() {
      try {
        const userCartRef = doc(db, "users", currentUser.uid);
        const productRef = doc(db, 'products', currentProduct.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists() || productSnap.data().stock < 1) {
          showError('This product is no longer available');
          return;
        }

        const availableStock = productSnap.data().stock;
        if (currentQuantity > availableStock) {
          showError(`Only ${availableStock} items available`);
          return;
        }

        const cartSnap = await getDoc(userCartRef);
        const currentCart = cartSnap.data()?.cart || [];
        const existingItem = currentCart.find(item => item.id === currentProduct.id);

        if (existingItem) {
          const newQuantity = existingItem.quantity + currentQuantity;
          if (newQuantity > availableStock) {
            showError(`Maximum ${availableStock} items available`);
            return;
          }
          const updatedCart = currentCart.map(item => 
            item.id === currentProduct.id 
              ? {...item, quantity: newQuantity} 
              : item
          );
          await updateDoc(userCartRef, { cart: updatedCart });
        } else {
          if (currentCart.length >= MAX_CART_ITEMS) {
            showError(`Cart limit reached (max ${MAX_CART_ITEMS} different products)`);
            return;
          }
          await updateDoc(userCartRef, {
            cart: arrayUnion({
              ...currentProduct,
              quantity: currentQuantity
            })
          });
        }
        
        await updateCartCount();
        showConfirmation();
      } catch (error) {
        console.error('Error adding to cart:', error);
        showError('Failed to add item to cart');
      }
    }

    // UI Feedback
    function showConfirmation() {
      const popup = document.createElement('div');
      popup.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          text-align: center;
        ">
          <p>✅ Added ${currentQuantity} item${currentQuantity > 1 ? 's' : ''} to cart!</p>
          <button onclick="window.location.href='cart.html'" 
            style="
              background: orangered;
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 5px;
              margin-top: 10px;
              cursor: pointer;
            ">
            View Cart
          </button>
        </div>
      `;
      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 3000);
    }

    function showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-notification';
      errorDiv.textContent = message;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 3000);
    }

    // Auth handling
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        await loadProduct();
        await updateCartCount();
      } else {
        window.location.href = 'index.html';
      }
    });

    // Cart icon click handler
    document.getElementById('cartIcon').addEventListener('click', () => {
      window.location.href = 'cart.html';
    });

