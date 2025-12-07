function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const error = document.getElementById("errorMsg");

    if (user === "admin" && pass === "123") {
        window.location.href = "admin-dashboard.html"; 
    } else {
        error.textContent = "Incorrect username or password!";
    }
}

document.getElementById("logoutBtn").addEventListener("click", function () {
    sessionStorage.clear();
    localStorage.clear();

    window.location.href = "admin/admin.html";
});


