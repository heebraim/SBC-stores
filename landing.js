// Initialize Loader Animation
const loaderText = "SBC-Stores";
const loaderElement = document.getElementById("loader");

loaderText.split("").forEach((char, index) => {
  const span = document.createElement("span");
  span.textContent = char;
  span.style.setProperty('--i', index);
  span.style.animationDelay = `${index * 0.2}s`;
  loaderElement.appendChild(span);
});

// Array of greetings
const greetings = [
  "Hi", "Hello", "How's your day?", "Welcome back", "Good to see you", 
  "Hey there", "Greetings", "Nice to see you", "Hi there", "Hello again"
];

// Function to get a random greeting
function getRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

// Firebase Imports
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
  arrayRemove,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase Configuration
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
let allProducts = [];
let currentCart = [];
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const categories = [
  { id: 'men', name: 'Men' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'women', name: 'Women' },
  { id: 'home', name: 'Home' },
  { id: 'sports', name: 'Sports' },
  { id: 'kids', name: 'Kids' },
  { id: 'toys', name: 'Toys' },
  { id: 'appliances', name: 'Appliances' }
];

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initializeUserCart();
    await updateUserProfile();
    loadProducts('uncategorized');
    handleCategorySelection();
    loadAllProducts();
    
    // Hide loader when everything is ready
    document.getElementById('loaderContainer').style.display = 'none';
  } else {
    window.location.href = 'index.html';
  }
});

// Firebase Functions
async function initializeUserCart() {
  const userCartRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(userCartRef);
  if (!docSnap.exists()) {
    await setDoc(userCartRef, { cart: [] });
  }
  
  // Set up real-time listener for cart changes
  unsubscribeCart = onSnapshot(userCartRef, (doc) => {
    currentCart = doc.data()?.cart || [];
    updateCartCount();
    updateAllProductCards(); // This ensures UI stays in sync with cart changes
  });
}

// New function to update all product cards when cart changes
function updateAllProductCards() {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  // Get all current product elements
  const productElements = Array.from(productsContainer.querySelectorAll('.product'));
  
  productElements.forEach(productElement => {
    const productId = productElement.dataset.productId;
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      // Create new product element with updated cart state
      const newProductElement = createProductElement(product);
      // Replace the existing element
      productElement.replaceWith(newProductElement);
    }
  });
}

async function updateUserProfile() {
  const userNameElement = document.getElementById('userName');
  const profilePicElement = document.getElementById('profilePic');

  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const greeting = getRandomGreeting();
      userNameElement.textContent = `${greeting}, ${userData.firstName || 'User'}`;
      if (userData.profilePicture) {
        profilePicElement.src = userData.profilePicture;
      }
    }
  } catch (error) {
    console.error('Profile load error:', error);
    userNameElement.textContent = 'Hi, User';
  }
}

function loadProducts(category) {
  const productsContainer = document.getElementById('products-container');
  productsContainer.innerHTML = '';

  if (unsubscribeProducts) unsubscribeProducts();
  
  let productsQuery;
  if (category === 'uncategorized') {
    productsQuery = query(
      collection(db, 'products'),
      where('category', '==', 'uncategorized')
    );
  } else {
    window.location.href = `category.html?category=${category}`;
    return;
  }

  unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
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
          category: productData.category || 'uncategorized',
          quantity: 1
        };
        
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
      productElement.querySelector('.minus-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const newQuantity = quantity - 1;
        await updateCartItemQuantity(product.id, newQuantity);
      });
      
      productElement.querySelector('.plus-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const newQuantity = quantity + 1;
        await updateCartItemQuantity(product.id, newQuantity);
      });
    } else {
      productElement.querySelector('.add-to-cart').addEventListener('click', async (e) => {
        e.stopPropagation();
        await addToCart(product);
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

async function updateCartItemQuantity(productId, newQuantity) {
  try {
    const userCartRef = doc(db, "users", currentUser.uid);
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists() || productSnap.data().stock < newQuantity) {
      showError('Not enough stock available');
      return;
    }

    // Optimistic UI update - update the UI before Firebase responds
    const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
    if (productElement) {
      const quantityValue = productElement.querySelector('.quantity-value');
      if (quantityValue) {
        quantityValue.textContent = newQuantity;
      }
      
      // Update button states immediately
      const minusBtn = productElement.querySelector('.minus-btn');
      const plusBtn = productElement.querySelector('.plus-btn');
      if (minusBtn) minusBtn.disabled = newQuantity <= 1;
      if (plusBtn) plusBtn.disabled = newQuantity >= productSnap.data().stock;
    }

    const updatedCart = currentCart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);

    await updateDoc(userCartRef, { cart: updatedCart });
    
    // The onSnapshot listener will handle the final state update
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    showError('Failed to update quantity');
    // Revert optimistic update if there was an error
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

    // Optimistic UI update - show the quantity controls immediately
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
    
    // The onSnapshot listener will handle the final state update
  } catch (error) {
    console.error('Error adding to cart:', error);
    showError('Failed to add item to cart');
    // Revert optimistic update if there was an error
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

// ... (keep all your remaining functions exactly as they were)

function handleCategorySelection() {
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const category = chip.dataset.category;
        document.querySelector('.category-chip.active').classList.remove('active');
        chip.classList.add('active');
        loadProducts(category);
      });
    });
  }

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

  async function loadAllProducts() {
    const productsQuery = collection(db, 'products');
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      allProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });
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

  // Event Listeners
  document.getElementById('cartIcon').addEventListener('click', () => {
    window.location.href = 'cart.html';
  });

  searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      searchSuggestions.style.display = 'none';
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      searchSuggestions.style.display = 'block';
    }
  });

  window.addEventListener('beforeunload', () => {
    if (unsubscribeProducts) unsubscribeProducts();
    if (unsubscribeCart) unsubscribeCart();
  });

  // Search Handling Functions
  function handleSearch(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    searchSuggestions.innerHTML = '';
    
    if (!searchTerm) {
      searchSuggestions.style.display = 'none';
      return;
    }

    const exactCategory = categories.find(c => 
      c.name.toLowerCase() === searchTerm || c.id.toLowerCase() === searchTerm
    );
    
    if (exactCategory) {
      window.location.href = `category.html?category=${exactCategory.id}`;
      return;
    }

    const matchedProducts = allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm)
    );
    
    const matchedCategories = categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm) ||
      category.id.toLowerCase().includes(searchTerm)
    );

    showSearchSuggestions(matchedProducts, matchedCategories);
  }

  function showSearchSuggestions(products, categories) {
    searchSuggestions.innerHTML = '';
    
    if (products.length === 0 && categories.length === 0) {
      const div = document.createElement('div');
      div.className = 'search-suggestion';
      div.textContent = 'No results found';
      searchSuggestions.appendChild(div);
    } else {
      if (categories.length > 0) {
        const header = document.createElement('div');
        header.className = 'search-suggestion';
        header.style.color = '#666';
        header.textContent = 'Categories';
        searchSuggestions.appendChild(header);

        categories.forEach(category => {
          const div = document.createElement('div');
          div.className = 'search-suggestion suggestion-category';
          div.innerHTML = `
            ${category.name}
            <span class="suggestion-type">Category</span>
          `;
          div.onclick = () => window.location.href = `category.html?category=${category.id}`;
          searchSuggestions.appendChild(div);
        });
      }

      if (products.length > 0) {
        const header = document.createElement('div');
        header.className = 'search-suggestion';
        header.style.color = '#666';
        header.textContent = 'Products';
        searchSuggestions.appendChild(header);

        products.forEach(product => {
          const div = document.createElement('div');
          div.className = 'search-suggestion';
          div.innerHTML = `
            <div>${product.name}</div>
            <div>
              <small>₦${product.price.toFixed(2)}</small>
              <span class="suggestion-type">Product</span>
            </div>
          `;
          div.onclick = () => window.location.href = `productdetails.html?id=${product.id}`;
          searchSuggestions.appendChild(div);
        });
      }
    }

    searchSuggestions.style.display = 'block';
  }