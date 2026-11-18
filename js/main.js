
const SUPABASE_URL = "https://lcuagwdwgonodbihprcm.supabase.co";
const SUPABASE_KEY = "sb_publishable_RXCKH33gznJV0-FRVzzweg_684t9kOu";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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