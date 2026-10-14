document.addEventListener("DOMContentLoaded", () => {
  const profileButton = document.getElementById("profileButton");
  const profileMenu = document.getElementById("profileMenu");
  const profileInitial = document.getElementById("profileInitial");
  const profileMenuInitial = document.getElementById("profileMenuInitial");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const logoutButton = document.getElementById("logoutButton");

  const myBookingsButton =
  document.getElementById("myBookingsButton");

  if (!profileButton || !profileMenu) {
    return;
  }

  function getInitial(name) {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
      return "U";
    }

    return cleanName.charAt(0).toUpperCase();
  }

  function openProfilePage() {
  window.open(
    "/profile",
    "_blank"
  );
}

  profileButton.addEventListener(
  "click",
  () => {
    openProfilePage();
  }
);

  async function loadProfile() {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok || !data.authenticated) {
        window.location.href = "/signin";
        return;
      }

      const name = data.user_name || "User";
      const email = data.user_email || "";

      const initial = getInitial(name);

      profileInitial.textContent = initial;
      profileMenuInitial.textContent = initial;
      profileName.textContent = name;
      profileEmail.textContent = email;
    } catch (error) {
      console.error("Unable to load profile:", error);
    }
  }
  myBookingsButton.addEventListener("click", () => {
    window.location.href = "/my-bookings";
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        }
      });

      if (response.ok) {
        window.location.href = "/signin";
        return;
      }

      logoutButton.disabled = false;
      logoutButton.textContent = "Logout";
      alert("Logout failed. Please try again.");
    } catch (error) {
      console.error("Logout error:", error);

      logoutButton.disabled = false;
      logoutButton.textContent = "Logout";
      alert("Unable to logout. Please try again.");
    }
  });

  loadProfile();
});