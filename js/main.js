
const SUPABASE_URL = "https://lcuagwdwgonodbihprcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_RXCKH33gznJV0-FRVzzweg_684t9kOu";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Shared helpers used by auth.js and checkout.js =====
const vybe = {
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
  money: n => "AED " + Number(n).toFixed(2),
  async user() { const { data: { session } } = await supabaseClient.auth.getSession(); return session ? session.user : null; },
  msg(text, ok) { const m = document.getElementById("message"); if (m) { m.textContent = text; m.className = "auth-msg " + (ok ? "ok" : "err"); } },
  next() { const n = new URLSearchParams(location.search).get("next"); return /^[a-z-]+\.html$/.test(n || "") ? n : "products.html"; }
};

// VYBE - Homepage JavaScript

console.log("Welcome to VYBE - Feel the Energy!");

// Smooth scrolling for homepage sections

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function(event) {

        const target = document.querySelector(
            this.getAttribute("href")
        );

        if (target) {
            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });
        }

    });

});