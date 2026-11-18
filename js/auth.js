document.addEventListener("DOMContentLoaded", async () => {
  // Navbar: change "Login" to "Logout" when signed in
  const user = await vybe.user();
  const link = document.querySelector('.nav-actions a[href="login.html"]');
  if (link && user) {
    link.textContent = "Logout"; link.href = "#";
    link.onclick = async e => { e.preventDefault(); await supabaseClient.auth.signOut(); location.href = "index.html"; };
  }

  const reg = document.getElementById("registerForm");
  if (reg) reg.onsubmit = async e => {
    e.preventDefault();
    const { data, error } = await supabaseClient.auth.signUp({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      options: { data: { full_name: document.getElementById("fullName").value.trim(),
                         phone: document.getElementById("phone").value.trim() } }
    });
    if (error) return vybe.msg(error.message);
    if (data.session) location.href = vybe.next();
    else vybe.msg("Account created. Check your email to confirm, then log in.", true);
  };

  const login = document.getElementById("loginForm");
  if (login) login.onsubmit = async e => {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value
    });
    if (error) return vybe.msg("Login failed: " + error.message);
    location.href = vybe.next();
  };
});