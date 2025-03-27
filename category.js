
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJvC26AJCiGOmjFD1CgG4Qc6kD72hl8qk",
  authDomain: "myecommercesite-d4f9b.firebaseapp.com",
  projectId: "myecommercesite-d4f9b",
  storageBucket: "myecommercesite-d4f9b.appspot.com",
  messagingSenderId: "330763504718",
  appId: "1:330763504718:web:d1c610bdf1bcf6f24f071f"
};

const MAX_CART_ITEMS = 90;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let unsubscribeProducts = null;
let unsubscribeCart = null;
let currentCart = [];
let allProducts = [];

function createRatingStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
  if (halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="far fa-star"></i>';
  return `<div class="rating">${starsHtml}</div>`;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initializeUserCart();
    loadProducts();
  } else {
    window.location.href = 'index.html';
  }
});

async function initializeUserCart() {
  const userCartRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(userCartRef);
  if (!docSnap.exists()) {
    await setDoc(userCartRef, { cart: [] });
  }
  
  unsubscribeCart = onSnapshot(userCartRef, (doc) => {
    currentCart = doc.data()?.cart || [];
    updateCartCount();
    updateAllProductCards();
  });
}

function loadProducts() {
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category');
  
  const productsContainer = document.getElementById('products-container');
  productsContainer.innerHTML = 'Loading products...';

  if (unsubscribeProducts) unsubscribeProducts();
  
  const productsQuery = query(
    collection(db, 'products'), 
    where('category', '==', category)
  );

  unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
    allProducts = [];
    productsContainer.innerHTML = '';
    snapshot.forEach(doc => {
      const productData = doc.data();
      if (productData.name && productData.price && productData.imageUrl) {
        const product = {
          id: doc.id,
          name: productData.name,
          price: productData.price,
          imageUrl: productData.imageUrl,
          description: productData.description || '',
          rating: productData.rating || 0,
          stock: productData.stock || 0,
          quantity: 1
        };
        allProducts.push(product);
        
        const productElement = createProductElement(product);
        productsContainer.appendChild(productElement);
      }
    });
  }, (error) => {
    console.error('Error loading products:', error);
    productsContainer.innerHTML = 'Failed to load products';
  });
}

function createProductElement(product) {
  const productElement = document.createElement('div');
  productElement.className = `product ${product.stock < 1 ? 'disabled' : ''}`;
  productElement.dataset.productId = product.id;

  const cartItem = currentCart.find(item => item.id === product.id);
  const inCart = !!cartItem;
  const quantity = cartItem ? cartItem.quantity : 0;

  productElement.innerHTML = `
    <div class="product-content">
      <img src="${product.imageUrl}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="rating-container">
        <div class="rating">${createRatingStars(product.rating)}</div>
        <span class="stock-count ${product.stock < 1 ? 'out-of-stock' : ''}">
          ${product.stock < 1 ? 'Out of stock' : `${product.stock} left`}
        </span>
      </div>
      <div class="price-container">
        <p class="product-price">₦${product.price.toFixed(2)}</p>
      </div>
      <div class="cart-controls-container">
        ${inCart ? `
          <div class="quantity-controls">
            <button class="quantity-btn minus-btn" ${quantity <= 1 ? 'disabled' : ''}>
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity-value">${quantity}</span>
            <button class="quantity-btn plus-btn" ${quantity >= product.stock ? 'disabled' : ''}>
              <i class="fas fa-plus"></i>
            </button>
          </div>
        ` : `
          <button class="add-to-cart" ${product.stock < 1 ? 'disabled' : ''}>
            <i class="fas fa-cart-plus"></i>
          </button>
        `}
      </div>
    </div>
  `;

  if (product.stock > 0) {
    if (inCart) {
      const minusBtn = productElement.querySelector('.minus-btn');
      const plusBtn = productElement.querySelector('.plus-btn');
      
      minusBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        minusBtn.disabled = true; // Disable immediately to prevent multiple clicks
        const newQuantity = quantity - 1;
        await updateCartItemQuantity(product.id, newQuantity);
        minusBtn.disabled = newQuantity <= 1; // Update disabled state after operation
      });
      
      plusBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        plusBtn.disabled = true; // Disable immediately to prevent multiple clicks
        const newQuantity = quantity + 1;
        await updateCartItemQuantity(product.id, newQuantity);
        plusBtn.disabled = newQuantity >= product.stock; // Update disabled state after operation
      });
    } else {
      const addBtn = productElement.querySelector('.add-to-cart');
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        addBtn.disabled = true; // Disable immediately to prevent multiple clicks
        await addToCart(product);
        addBtn.disabled = false; // Re-enable after operation
      });
    }
    
    productElement.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('.quantity-controls') && !e.target.closest('.add-to-cart')) {
        window.location.href = `productdetails.html?id=${product.id}`;
      }
    });
  }

  return productElement;
}

function updateAllProductCards() {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  const productElements = Array.from(productsContainer.querySelectorAll('.product'));
  
  productElements.forEach(productElement => {
    const productId = productElement.dataset.productId;
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      const newProductElement = createProductElement(product);
      productElement.replaceWith(newProductElement);
    }
  });
}

async function updateCartItemQuantity(productId, newQuantity) {
  try {
    const userCartRef = doc(db, "users", currentUser.uid);
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists() || productSnap.data().stock < newQuantity) {
      showError('Not enough stock available');
      return;
    }

    // Optimistic UI update
    const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
    if (productElement) {
      const quantityValue = productElement.querySelector('.quantity-value');
      if (quantityValue) {
        quantityValue.textContent = newQuantity;
      }
    }

    const updatedCart = currentCart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);

    await updateDoc(userCartRef, { cart: updatedCart });
    
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    showError('Failed to update quantity');
    updateAllProductCards();
  }
}

async function addToCart(product) {
  try {
    const userCartRef = doc(db, "users", currentUser.uid);
    const productRef = doc(db, 'products', product.id);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists() || productSnap.data().stock < 1) {
      showError('This product is no longer available');
      return;
    }

    if (currentCart.length >= MAX_CART_ITEMS) {
      showError(`Cart limit reached (max ${MAX_CART_ITEMS} different products)`);
      return;
    }

    // Optimistic UI update
    const productElement = document.querySelector(`.product[data-product-id="${product.id}"]`);
    if (productElement) {
      productElement.querySelector('.cart-controls-container').innerHTML = `
        <div class="quantity-controls">
          <button class="quantity-btn minus-btn">
            <i class="fas fa-minus"></i>
          </button>
          <span class="quantity-value">1</span>
          <button class="quantity-btn plus-btn" ${1 >= productSnap.data().stock ? 'disabled' : ''}>
            <i class="fas fa-plus"></i>
          </button>
        </div>
      `;
    }

    const updatedCart = [...currentCart, {
      ...product,
      quantity: 1
    }];

    await updateDoc(userCartRef, { cart: updatedCart });
    
    showCartNotification();
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    showError('Failed to add item to cart');
    updateAllProductCards();
  }
}

async function updateCartCount() {
  try {
    const countElement = document.getElementById('cartCount');
    const uniqueItems = currentCart.length;
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    
    countElement.textContent = totalItems;
    countElement.title = `${uniqueItems}/${MAX_CART_ITEMS} different products`;
    countElement.style.backgroundColor = uniqueItems >= MAX_CART_ITEMS ? 'orange' : 'red';
  } catch (error) {
    console.error('Error updating cart count:', error);
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-notification';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

function showCartNotification() {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 10px;
    ">
      <i class="fas fa-check-circle" style="color: green;"></i>
      Item added to cart!
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// Back Button Functionality
document.getElementById('backButton').addEventListener('click', () => {
  window.location.href = 'landing.html';
});

document.getElementById('cartIcon').addEventListener('click', () => {
  window.location.href = 'cart.html';
});

window.addEventListener('beforeunload', () => {
  if (unsubscribeProducts) unsubscribeProducts();
  if (unsubscribeCart) unsubscribeCart();
});
