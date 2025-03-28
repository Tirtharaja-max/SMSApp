// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6SfdTa8FlFPvvhuSlfCnLCrNGWtN7XhA",
    authDomain: "smstirtha.firebaseapp.com",
    projectId: "smstirtha",
    storageBucket: "smstirtha.firebasestorage.app",
    messagingSenderId: "67088579557",
   appId: "1:67088579557:web:a3fc5a690c9a0d169ccd0c", // Replace with real appId from Firebase Console
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const approvedUsersSheet = "https://docs.google.com/spreadsheets/d/10FdflYy5fTyD0FeTy3UC7cCSsXu-jjnpuxWQNfV2dKA/export?format=csv";
const contactsSheet = "https://docs.google.com/spreadsheets/d/1tAQXaJYe4Bqdf6rIiXh1006HIkNaDtTM8CNxg3TDK-o/export?format=csv";

let approvedUsers = [];
let contacts = [];

async function fetchSheetData(url, label) {
    try {
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log(`Raw ${label} data:`, text);
        const rows = text.trim().split("\n").slice(1);
        return rows.map(row => row.replace(/"/g, "").trim());
    } catch (error) {
        console.error(`Fetch error for ${label}:`, error);
        if (label === "Approved Users") return ["test@example.com"];
        if (label === "Contacts") return ["Unknown,1234567890"];
        return [];
    }
}

async function loadApp() {
    approvedUsers = await fetchSheetData(approvedUsersSheet, "Approved Users");
    console.log("Processed Approved Users:", approvedUsers);

    const contactRows = await fetchSheetData(contactsSheet, "Contacts");
    contacts = contactRows.map(row => {
        const parts = row.split(",");
        return { name: parts[0] || "Unknown", phone: parts[1] || parts[0] };
    });
    console.log("Processed Contacts:", contacts);
}

// Google Login
document.getElementById("google-login-btn").addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const userEmail = result.user.email;
            console.log("Logged in as:", userEmail);
            checkApprovedUser(userEmail);
        })
        .catch((error) => {
            document.getElementById("auth-message").textContent = "Login failed: " + error.message;
        });
});

function checkApprovedUser(email) {
    const authMessage = document.getElementById("auth-message");
    const isApproved = approvedUsers.some(user => user.toLowerCase() === email.toLowerCase());
    if (isApproved) {
        authMessage.textContent = "Login successful!";
        setTimeout(() => {
            document.getElementById("auth-section").style.display = "none";
            document.getElementById("app-section").style.display = "block";
            loadContacts();
        }, 1000);
    } else {
        authMessage.textContent = "You are not an approved user.";
    }
}

function loadContacts() {
    const contactList = document.getElementById("contact-list");
    contactList.innerHTML = "";
    contacts.forEach(contact => {
        const option = document.createElement("option");
        option.value = contact.phone;
        option.textContent = `${contact.name} (${contact.phone})`;
        contactList.appendChild(option);
    });
}

function selectAllContacts() {
    const contactList = document.getElementById("contact-list");
    for (let option of contactList.options) {
        option.selected = true;
    }
}

function sendSMS() {
    const contactList = document.getElementById("contact-list");
    const selectedOptions = Array.from(contactList.selectedOptions);
    const phones = selectedOptions.map(option => option.value);
    const message = document.getElementById("message-input").value;
    const statusMessage = document.getElementById("status-message");

    if (phones.length === 0 || !message) {
        statusMessage.textContent = "Please select at least one contact and enter a message.";
        return;
    }
    const phoneList = phones.join(",");
    window.location.href = `sms:${phoneList}?body=${encodeURIComponent(message)}`;
    statusMessage.textContent = "Opening SMS app...";
}

// Load app on page load
loadApp();