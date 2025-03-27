// Back Button Functionality
document.getElementById('backButton').addEventListener('click', () => {
  window.history.back() || (window.location.href = 'landing.html');
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
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
const MAX_CART_ITEMS = 90;
const ITEMS_PER_QUERY = 10;
let currentUser = null;
let unsubscribeCart = null;

function chunkArray(array, chunkSize) {
  const results = [];
  while (array.length) {
    results.push(array.splice(0, chunkSize));
  }
  return results;
}

// New function to check stock levels
async function checkStockLevels(cart) {
  if (cart.length === 0) return {};
  
  const productIds = cart.map(item => item.id);
  const idChunks = chunkArray([...productIds], ITEMS_PER_QUERY);
  const stockData = {};
  
  for (const chunk of idChunks) {
    const q = query(collection(db, "products"), where("__name__", "in", chunk));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      stockData[doc.id] = doc.data().stock || 0;
    });
  }
  
  return stockData;
}

async function validateCartItems(cart) {
  if (cart.length === 0) return [];
  
  const stockData = await checkStockLevels(cart);
  const validatedCart = [];
  
  for (const item of cart) {
    const availableStock = stockData[item.id] || 0;
    
    if (availableStock > 0) {
      const validQuantity = Math.min(item.quantity, availableStock);
      validatedCart.push({
        ...item,
        quantity: validQuantity
      });
      
      if (validQuantity !== item.quantity) {
        showNotification(`Reduced quantity of ${item.name} to available stock (${availableStock})`);
      }
    }
  }
  
  return validatedCart;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'stock-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function updateLimitIndicator(cart) {
  const limitDiv = document.createElement('div');
  limitDiv.className = 'cart-limit';
  limitDiv.innerHTML = `
    <div>Products in cart: ${cart.length}/${MAX_CART_ITEMS}</div>
    <progress value="${cart.length}" max="${MAX_CART_ITEMS}"></progress>
  `;
  
  const existingIndicator = document.querySelector('.cart-limit');
  if (existingIndicator) {
    existingIndicator.replaceWith(limitDiv);
  } else {
    document.querySelector('.cart-container').prepend(limitDiv);
  }
}

function renderCart(cart) {
  const container = document.getElementById('cart-items');
  const emptyMsg = document.getElementById('empty-message');
  const checkoutSection = document.getElementById('checkout-section');
  
  container.innerHTML = '';
  
  if (cart.length === 0) {
    emptyMsg.style.display = 'block';
    checkoutSection.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  checkoutSection.style.display = 'block';

  let total = 0;
  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.name}">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>₦${item.price.toFixed(2)}</p>
      </div>
      <div class="quantity-controls">
        <div class="quantity-buttons">
          <button class="qty-btn minus">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn plus">+</button>
        </div>
        <button class="remove-btn"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;

    cartItem.querySelector('.minus').addEventListener('click', () => updateQuantity(index, -1));
    cartItem.querySelector('.plus').addEventListener('click', () => updateQuantity(index, 1));
    cartItem.querySelector('.remove-btn').addEventListener('click', () => removeItem(index));

    container.appendChild(cartItem);
    total += item.price * item.quantity;
  });

  document.getElementById('checkout-btn').textContent = 
    `Checkout (${cart.reduce((sum, item) => sum + item.quantity, 0)} items) - ₦${total.toFixed(2)}`;
  
  updateLimitIndicator(cart);
}

async function loadCart() {
  const userCartRef = doc(db, "users", currentUser.uid);
  
  unsubscribeCart = onSnapshot(userCartRef, async (docSnap) => {
    if (docSnap.exists()) {
      let cart = docSnap.data().cart || [];
      cart = await validateCartItems([...cart]);
      
      if (cart.length !== docSnap.data().cart.length) {
        await updateDoc(userCartRef, { cart });
      }
      
      renderCart(cart);
    }
  });
}

async function updateQuantity(index, change) {
  const userCartRef = doc(db, "users", currentUser.uid);
  const cartSnap = await getDoc(userCartRef);
  const cart = [...cartSnap.data().cart];
  
  // Get current stock for this item
  const stockData = await checkStockLevels([cart[index]]);
  const availableStock = stockData[cart[index].id] || 0;
  const newQuantity = cart[index].quantity + change;
  
  // Don't allow quantity to go below 1
  if (newQuantity < 1) return;
  
  // Check stock when increasing quantity
  if (change > 0 && newQuantity > availableStock) {
    showNotification(`Only ${availableStock} available in stock`);
    return;
  }
  
  cart[index].quantity = Math.min(newQuantity, availableStock);
  await updateDoc(userCartRef, { cart });
}

async function removeItem(index) {
  const userCartRef = doc(db, "users", currentUser.uid);
  const cartSnap = await getDoc(userCartRef);
  const cart = [...cartSnap.data().cart];
  
  cart.splice(index, 1);
  await updateDoc(userCartRef, { cart });
}

document.getElementById('checkout-btn').addEventListener('click', async () => {
  try {
    const userCartRef = doc(db, "users", currentUser.uid);
    const cartSnap = await getDoc(userCartRef);
    let cart = cartSnap.data().cart || [];
    
    // Validate stock before checkout
    const stockData = await checkStockLevels(cart);
    const outOfStockItems = cart.filter(item => {
      const availableStock = stockData[item.id] || 0;
      return item.quantity > availableStock;
    });
    
    if (outOfStockItems.length > 0) {
      showNotification("Some items in your cart exceed available stock. Please adjust quantities.");
      return;
    }
    
    sessionStorage.setItem('checkoutCart', JSON.stringify(cart));
    window.location.href = 'checkout.html';
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error initiating checkout');
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadCart();
  } else {
    window.location.href = 'index.html';
  }
});

window.addEventListener('beforeunload', () => {
  if (unsubscribeCart) unsubscribeCart();
});