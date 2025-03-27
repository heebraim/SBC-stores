
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
        import { 
            getAuth, 
            signOut, 
            onAuthStateChanged,
            setPersistence,
            browserLocalPersistence
        } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js";
        import { 
            getFirestore,
            doc,
            getDoc,
            collection,
            getDocs,
            addDoc,
            writeBatch,
            serverTimestamp,
            increment,
            updateDoc
        } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

        // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyBJvC26AJCiGOmjFD1CgG4Qc6kD72hl8qk",
            authDomain: "myecommercesite-d4f9b.firebaseapp.com",
            projectId: "myecommercesite-d4f9b",
            storageBucket: "myecommercesite-d4f9b.appspot.com",
            messagingSenderId: "330763504718",
            appId: "1:330763504718:web:d1c610bdf1bcf6f24f071f"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const paystackPublicKey = "pk_test_f3e86347979975ece86692a84233338606bfeb43";
        let currentOrderRef = null;

        // DOM Elements
        const elements = {
            userEmail: document.getElementById('userEmail'),
            logoutButton: document.getElementById('logoutButton'),
            checkoutForm: document.getElementById('checkoutForm'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            errorMessage: document.getElementById('errorMessage'),
            cartItems: document.getElementById('cartItems'),
            totalAmount: document.getElementById('totalAmount'),
            fullName: document.getElementById('fullName'),
            streetAddress: document.getElementById('streetAddress'),
            city: document.getElementById('city'),
            state: document.getElementById('state'),
            phone: document.getElementById('phone'),
            backButton: document.getElementById('backButton')
        };

        // Retrieve cart data from session storage
        const cart = JSON.parse(sessionStorage.getItem('checkoutCart')) || [];
        console.log('Cart loaded from session storage:', cart);

        // Render cart items
        renderCartItems(cart);

        // Show Loading Overlay
        function showLoading(show) {
            if (elements.loadingOverlay) {
                elements.loadingOverlay.style.display = show ? 'flex' : 'none';
            }
        }

        // Hide Error Message
        function hideError() {
            if (elements.errorMessage) {
                elements.errorMessage.style.display = 'none';
            }
        }

        // Validate and Get Address Data
        function validateAndGetAddress() {
            const addressData = {
                fullName: elements.fullName.value.trim(),
                street: elements.streetAddress.value.trim(),
                city: elements.city.value.trim(),
                state: elements.state.value,
                phone: elements.phone.value.trim()
            };

            if (!validateAddress(addressData)) {
                throw new Error('Please fill all required fields correctly');
            }

            return addressData;
        }

        // Validate Address Data
        function validateAddress({ fullName, street, city, phone }) {
            return fullName.length > 3 &&
                   street.length > 5 &&
                   city.length > 2 &&
                   /^(\+?234|0)[789]\d{9}$/.test(phone);
        }

        // Create Order Document
        async function createOrderDocument(user, address, cart) {
            const orderData = {
                userId: user.uid,
                email: user.email,
                items: cart,
                total: parseInt(elements.totalAmount.textContent.replace(/,/g, '')),
                shippingAddress: address,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            console.log('Creating order document:', orderData);
            const orderRef = await addDoc(collection(db, "orders"), orderData);
            console.log('Order document created with ID:', orderRef.id);
            return orderRef;
        }

        // Initialize Paystack Payment
        function initializePaystackPayment(user, orderRef) {
            console.log('Initializing Paystack payment for order:', orderRef.id);
            const paymentHandler = PaystackPop.setup({
                key: paystackPublicKey,
                email: user.email,
                amount: parseInt(elements.totalAmount.textContent.replace(/,/g, '')) * 100,
                ref: orderRef.id, // Use Firestore document ID as Paystack reference
                metadata: { 
                    userId: user.uid, 
                    orderId: orderRef.id 
                },
                callback: function (response) {
                    console.log('Paystack callback triggered:', response);
                    if (response.status === 'success') {
                        handlePaymentSuccess(response.reference, orderRef.id)
                            .then(() => {
                                console.log('Payment successful, updating order and stock.');
                                showLoading(false);
                                showError('Payment successful!');
                            })
                            .catch((error) => {
                                console.error('Payment success handling failed:', error);
                                handlePaymentError(error);
                            });
                    } else {
                        console.error('Payment failed:', response);
                        handlePaymentError(new Error('Payment failed'));
                    }
                },
                onClose: function () {
                    console.log('Payment window closed');
                    showLoading(false);
                    showError('Payment cancelled. Please try again.');
                    const submitButton = document.querySelector('#checkoutForm button[type="submit"]');
                    submitButton.disabled = false;
                }
            });
            
            paymentHandler.openIframe();
        }

        // Handle Payment Success
        
        async function handlePaymentSuccess(paymentReference, orderId) {
  showLoading(true);
  
  try {
    // 1. Update order status FIRST
    await updateDoc(doc(db, "orders", orderId), {
      status: 'paid',
      paymentReference: paymentReference,
      updatedAt: serverTimestamp()
    });

    // 2. Update stock using batched writes
    const cart = JSON.parse(sessionStorage.getItem('checkoutCart'));
    const batch = writeBatch(db);
    
    cart.forEach(item => {
      const productRef = doc(db, "products", item.id);
      batch.update(productRef, {
        stock: increment(-item.quantity),
        sold: increment(item.quantity)
      });
    });

    await batch.commit();
    
    // 3. Clear cart
    await updateDoc(doc(db, "users", auth.currentUser.uid), { cart: [] });
    sessionStorage.removeItem('checkoutCart');

    window.location.href = `order-success.html?orderId=${orderId}`;
  } catch (error) {
    console.error("Error:", error);
    alert("Payment successful! If stock didn't update, contact support.");
  } finally {
    showLoading(false);
  }
}

            // Handle Payment Error
        function handlePaymentError(error) {
            console.error('Payment error:', error);
            showLoading(false);
            if (error.message !== 'Payment cancelled. Please try again.') {
                showError('Payment failed. Please try again.');
            }
            const submitButton = document.querySelector('#checkoutForm button[type="submit"]');
            submitButton.disabled = false;
        }

        // Handle Form Submission
        async function handleFormSubmit(e) {
            e.preventDefault();
            showLoading(true);
            hideError();

            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            const user = auth.currentUser;
            if (!user) {
                console.error('User not authenticated');
                throw new Error('Authentication required');
            }

            try {
                const addressData = validateAndGetAddress();
                
                if (cart.length === 0) throw new Error('Cart is empty');
                
                const orderRef = await createOrderDocument(user, addressData, cart);
                initializePaystackPayment(user, orderRef);
            } catch (error) {
                console.error('Checkout error:', error);
                handleCheckoutError(error);
                submitButton.disabled = false;
            }
        }

        // Handle Checkout Error
        function handleCheckoutError(error) {
            console.error('Checkout error:', error);
            showLoading(false);
            showError(error.message || 'Checkout failed. Please try again.');
            const submitButton = document.querySelector('#checkoutForm button[type="submit"]');
            submitButton.disabled = false;
        }

        // Initialize Event Listeners
        function initializeEventListeners() {
            if (elements.logoutButton) {
                elements.logoutButton.addEventListener('click', () => signOut(auth));
            }
            if (elements.checkoutForm) {
                elements.checkoutForm.addEventListener('submit', handleFormSubmit);
            }
            if (elements.backButton) {
                elements.backButton.addEventListener('click', () => {
                    window.location.href = 'cart.html';
                });
            }
        }

        // Render Cart Items
        function renderCartItems(cart) {
            if (!elements.cartItems || !elements.totalAmount) {
                console.error('Cart items or total amount element not found');
                return;
            }

            let total = 0;
            elements.cartItems.innerHTML = cart.map(item => `
                <div class="d-flex align-items-center gap-3 mb-3">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" class="cart-item-image" alt="${item.name}" loading="lazy">` : ''}
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${item.name}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>₦${item.price.toLocaleString()} x ${item.quantity}</span>
                            <span class="text-success">₦${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            elements.totalAmount.textContent = total.toLocaleString();
        }

        // Show Error Message
        function showError(message) {
            if (elements.errorMessage) {
                elements.errorMessage.textContent = message;
                elements.errorMessage.style.display = 'block';
                setTimeout(() => elements.errorMessage.style.display = 'none', 5000);
            }
        }

        // Initialization
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Checkout page loaded');
            initializeEventListeners();

            // Populate user email
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log('User authenticated:', user.email);
                    elements.userEmail.textContent = user.email;
                } else {
                    console.log('User not authenticated, redirecting to login');
                    window.location.href = 'login.html';
                }
            });
        });
