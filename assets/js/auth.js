const ADMIN_ACCOUNT = {
  email: "admin@school.edu.vn",
  password: "admin123",
  role: "admin",
  name: "Administrator"
};

/* ===== SWITCH ROLE TAB ===== */
function switchRole(role, btn) {
  document.getElementById("role").value = role;
  document.getElementById("error").innerText = "";

  document.querySelectorAll(".tab")
    .forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("email").placeholder =
    role + "@school.edu.vn";
}

/* ===== LOGIN ===== */
async function login(e) {
  e.preventDefault();

  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  /* ===== ADMIN ===== */
  if (role === "admin") {
    if (
      email === ADMIN_ACCOUNT.email &&
      password === ADMIN_ACCOUNT.password
    ) {
      sessionStorage.setItem("currentUser", JSON.stringify({
        role: "admin",
        name: ADMIN_ACCOUNT.name
      }));

      errorEl.style.color = "green";
      errorEl.innerText = "✅ Đăng nhập Admin thành công";

      setTimeout(() => {
        location.href = "admin/dashboard.html";
      }, 400);
      return;
    } else {
      errorEl.style.color = "red";
      errorEl.innerText = "❌ Sai tài khoản Admin";
      return;
    }
  }

  /* ===== TEACHER / PARENT ===== */
  try {
    const res = await fetch("./data/users.json");
    if (!res.ok) throw new Error("404");

    const db = await res.json();

    const user = db.users.find(u =>
      u.email === email &&
      u.password === password &&
      u.role === role
    );

    if (!user) {
      errorEl.style.color = "red";
      errorEl.innerText = "❌ Sai tài khoản hoặc sai tab vai trò";
      return;
    }

    sessionStorage.setItem("currentUser", JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name
    }));

    errorEl.style.color = "green";
    errorEl.innerText = "✅ Đăng nhập thành công";

    setTimeout(() => {
      location.href =
        role === "teacher"
          ? "teacher/dashboard.html"
          : "parent/dashboard.html";
    }, 400);

  } catch (err) {
    errorEl.style.color = "red";
    errorEl.innerText = "❌ Không đọc được users.json (kiểm tra Live Server)";
    console.error(err);
  }
}
