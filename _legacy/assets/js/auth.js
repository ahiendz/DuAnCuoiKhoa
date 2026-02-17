/* ===== SWITCH ROLE TAB ===== */
function switchRole(role, btn) {
  document.getElementById("role").value = role;
  document.getElementById("error").innerText = "";

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("email").placeholder = `${role}@school.edu.vn`;
}

/* ===== LOGIN ===== */
async function login(e) {
  e.preventDefault();

  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Đăng nhập thất bại");

    sessionStorage.setItem(
      "currentUser",
      JSON.stringify({
        id: data.id,
        role: data.role,
        name: data.name
      })
    );

    errorEl.style.color = "green";
    errorEl.innerText = "Đăng nhập thành công";

    setTimeout(() => {
      if (role === "admin") location.href = "admin/dashboard.html";
      else if (role === "teacher") location.href = "teacher/dashboard.html";
      else location.href = "parent/dashboard.html";
    }, 400);
  } catch (err) {
    errorEl.style.color = "red";
    errorEl.innerText = err.message || "Sai tài khoản hoặc mật khẩu";
  }
}
