document.getElementById("avatarInput")
.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch("/api/upload/avatar", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (data.url) {
    document.getElementById("preview").src = data.url;
    document.getElementById("avatar_url").value = data.url;
    document.getElementById("public_id").value = data.public_id;
  }
});
