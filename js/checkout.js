// Cart format (agreed with Member 2): localStorage "cart" = [{ id, name, price, qty }], id = product_id
document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("checkoutBox");
  if (!box) return;
  const user = await vybe.user();
  if (!user) { location.href = "login.html?next=checkout.html"; return; }

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!cart.length) { box.innerHTML = '<p>Your cart is empty. <a href="products.html">Browse products</a></p>'; return; }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("summary").innerHTML =
    cart.map(i => `<p>${i.qty} &times; ${vybe.esc(i.name)} &ndash; ${vybe.money(i.price * i.qty)}</p>`).join("") +
    `<h3>Total: ${vybe.money(total)}</h3>`;

  // SELECT: pre-fill phone from the customer's profile
  const { data: profile } = await supabaseClient.from("customers").select("phone").eq("customer_id", user.id).single();
  if (profile && profile.phone) document.getElementById("phone").value = profile.phone;

  document.getElementById("checkoutForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button"); btn.disabled = true;

    // INSERT 1: the order (total and prices are recalculated by database triggers)
    const { data: order, error } = await supabaseClient.from("orders").insert({
      customer_id: user.id, total_amount: 0, status: "Pending",
      shipping_address: document.getElementById("address").value.trim(),
      phone: document.getElementById("phone").value.trim()
    }).select().single();
    if (error) { btn.disabled = false; return vybe.msg(error.message); }

    // INSERT 2: the purchased products (stock is reduced by a trigger)
    const rows = cart.map(i => ({ order_id: order.order_id, product_id: i.id, quantity: i.qty, unit_price: 0 }));
    const { error: itemsError } = await supabaseClient.from("order_items").insert(rows);
    if (itemsError) {
      await supabaseClient.from("orders").delete().eq("order_id", order.order_id); // DELETE: undo the empty order
      btn.disabled = false;
      return vybe.msg("Could not place the order. A product may be out of stock.");
    }

    localStorage.removeItem("cart");
    box.innerHTML = `<h2>Order confirmed</h2><p>Thank you! Your order number is <b>#${order.order_id}</b>.</p><a class="primary-btn" href="products.html">Continue shopping</a>`;
  };
});