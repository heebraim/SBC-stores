import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
        import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";
        import { getAuth } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js";

        // Your Firebase config
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
        const db = getFirestore(app);
        const auth = getAuth(app);

        // Get order ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');

        if (orderId) {
            // Display order ID
            document.getElementById('orderId').textContent = orderId;

            // Fetch order details
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);

            if (orderSnap.exists()) {
                const orderData = orderSnap.data();
                
                // Format date
                const orderDate = orderData.createdAt.toDate();
                document.getElementById('orderDate').textContent = orderDate.toLocaleString();
                
                // Display total
                document.getElementById('orderTotal').textContent = `₦${orderData.total.toLocaleString()}`;
                
                // Update status if needed
                if (orderData.status) {
                    document.getElementById('orderStatus').textContent = orderData.status;
                }
            }
        }