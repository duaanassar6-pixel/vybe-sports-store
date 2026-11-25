// ===============================
// VYBE - PRODUCTS PAGE
// ===============================
const SUPABASE_URL = "https://lcuagwdwgonodbihprcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_RXCKH33gznJV0-FRVzzweg_684t9kOu";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const vybe = {
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
  money: n => "AED " + Number(n).toFixed(2),
  async user() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session ? session.user : null;
  },
  msg(text, ok) {
    const m = document.getElementById("message");
    if (m) {
      m.textContent = text;
      m.className = "auth-msg " + (ok ? "ok" : "err");
    }
  },
  next() {
    const n = new URLSearchParams(location.search).get("next");
    return /^[a-z-]+\.html$/.test(n || "") ? n : "products.html";
  }
};
let allProducts = [];

const productGrid = document.getElementById("product-grid");

if (productGrid) {
    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");
    const sortSelect = document.getElementById("sort-select");

    async function loadProducts() {
        productGrid.innerHTML = "<p>Loading products...</p>";

        const { data, error } = await supabaseClient
            .from("product")
            .select("*, category(name, slug)");

        if (error) {
            console.error(error);
            productGrid.innerHTML = "<p>Could not load products.</p>";
            return;
        }

        allProducts = data || [];

        const params = new URLSearchParams(window.location.search);
        const selectedCategory = params.get("category");

        if (selectedCategory && categoryFilter) {
            categoryFilter.value = selectedCategory;
        }

        displayProducts();
    }

    function displayProducts() {
        let filtered = [...allProducts];

        const search = searchInput?.value.toLowerCase().trim() || "";

        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(search)
        );

        const category = categoryFilter?.value || "all";

        if (category !== "all") {
            filtered = filtered.filter(product =>
                product.category?.slug === category
            );
        }

        if (sortSelect?.value === "low-high") {
            filtered.sort((a, b) => a.price - b.price);
        }

        if (sortSelect?.value === "high-low") {
            filtered.sort((a, b) => b.price - a.price);
        }

        if (filtered.length === 0) {
            productGrid.innerHTML = "<p>No products found.</p>";
            return;
        }

        productGrid.innerHTML = filtered.map(product => `
            <div class="product-card">
                <a href="product-details.html?id=${product.product_id}">
                    <div class="product-image">
                        <img
                            src="../images/${vybe.esc(product.image_url)}"
                            alt="${vybe.esc(product.name)}"
                        >
                    </div>
                </a>

                <div class="product-info">
                    <p>${vybe.esc(product.category?.name || "")}</p>
                    <h3>${vybe.esc(product.name)}</h3>
                    <p>${vybe.money(product.price)}</p>
                    <p>Stock: ${Number(product.stock)}</p>

                    <button onclick="addToCart(${Number(product.product_id)})">
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join("");
    }

    searchInput?.addEventListener("input", displayProducts);
    categoryFilter?.addEventListener("change", displayProducts);
    sortSelect?.addEventListener("change", displayProducts);

    loadProducts();
}


// ===============================
// SHOPPING CART
// ===============================

function addToCart(productId) {
    const product = allProducts.find(item =>
        Number(item.product_id) === Number(productId)
    );

    if (!product) {
        alert("Product not found.");
        return;
    }

    let cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existingItem = cart.find(item =>
        Number(item.product_id) === Number(productId)
    );

    if (existingItem) {
        if (existingItem.quantity >= Number(product.stock)) {
            alert("Sorry, maximum available stock reached.");
            return;
        }

        existingItem.quantity++;
    } else {
        if (Number(product.stock) <= 0) {
            alert("This product is out of stock.");
            return;
        }

        cart.push({
            ...product,
            quantity: 1
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    alert("Product added to cart!");
}
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const count = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);

  document.querySelectorAll("#cart-count").forEach(button => {
    button.textContent = `Cart (${count})`;
  });
}

updateCartCount();