import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { 
      getAuth, 
      onAuthStateChanged
    } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
    import { 
      getFirestore, 
      collection, 
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

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    let allProducts = [];
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
    document.getElementById('cartIcon').addEventListener('click', showAuthModal);

    function createProductElement(product) {
      const productElement = document.createElement('div');
      productElement.className = `product ${product.stock < 1 ? 'disabled' : ''}`;
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
            <button class="add-to-cart" ${product.stock < 1 ? 'disabled' : ''}>
              <i class="fas fa-cart-plus"></i>
            </button>
          </div>
        </div>
      `;

      if (product.stock > 0) {
        productElement.querySelector('.add-to-cart').addEventListener('click', showAuthModal);
        productElement.querySelector('img').addEventListener('click', () => {
          window.location.href = `welcomeproductdetails.html?id=${product.id}`;
        });
      }

      return productElement;
    }

    function loadProducts(category) {
      const productsContainer = document.getElementById('products-container');
      productsContainer.innerHTML = 'Loading products...';

      const productsQuery = query(
        collection(db, 'products'),
        where('category', '==', category)
      );

      onSnapshot(productsQuery, (snapshot) => {
        productsContainer.innerHTML = '';
        snapshot.forEach(doc => {
          const productData = doc.data();
          const product = {
            id: doc.id,
            ...productData
          };
          productsContainer.appendChild(createProductElement(product));
        });
      });
    }

    function createRatingStars(rating) {
      const fullStars = Math.floor(rating);
      const halfStar = rating % 1 >= 0.5 ? 1 : 0;
      const emptyStars = 5 - fullStars - halfStar;
      return `
        <div class="rating">
          ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
          ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
          ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
        </div>
      `;
    }

    function handleCategorySelection() {
      document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelector('.category-chip.active').classList.remove('active');
          chip.classList.add('active');
          loadProducts(chip.dataset.category);
        });
      });
    }

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
        loadProducts(exactCategory.id);
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
            div.innerHTML = `${category.name}<span class="suggestion-type">Category</span>`;
            div.onclick = () => {
              loadProducts(category.id);
              searchSuggestions.style.display = 'none';
              searchInput.value = '';
            };
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
            div.onclick = () => {
              window.location.href = `welcomeproductdetails.html?id=${product.id}`;
              searchSuggestions.style.display = 'none';
              searchInput.value = '';
            };
            searchSuggestions.appendChild(div);
          });
        }
      }
      searchSuggestions.style.display = 'block';
    }

    // Initialize
    loadProducts('uncategorized');
    handleCategorySelection();
    
    // Load all products for search
    onSnapshot(collection(db, 'products'), (snapshot) => {
      allProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    });

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
      if (e.target.value === '') {
        searchSuggestions.style.display = 'none';
      }
    });

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