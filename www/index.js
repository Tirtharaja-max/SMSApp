// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6SfdTa8FlFPvvhuSlfCnLCrNGWtN7XhA",
    authDomain: "smstirtha.firebaseapp.com",
    projectId: "smstirtha",
    storageBucket: "smstirtha.firebasestorage.app",
    messagingSenderId: "67088579557",
    appId: "1:67088579557:web:placeholder_hash" // REPLACE WITH REAL appId
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

const approvedUsersSheet = "https://docs.google.com/spreadsheets/d/10FdflYy5fTyD0FeTy3UC7cCSsXu-jjnpuxWQNfV2dKA/export?format=csv";
const contactsSheet = "https://docs.google.com/spreadsheets/d/1tAQXaJYe4Bqdf6rIiXh1006HIkNaDtTM8CNxg3TDK-o/export?format=csv";

let approvedUsers = [];
let contacts = [];

async function fetchSheetData(url, label) {
    try {
        console.log(`Attempting to fetch ${label} from:`, url);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Direct fetch failed for ${label}. Status: ${response.status}, StatusText: ${response.statusText}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        console.log(`Raw ${label} data:`, text);
        const rows = text.trim().split("\n");
        const dataRows = rows.slice(1).map(row => {
            const columns = row.split(",");
            return columns[0].replace(/"/g, "").trim();
        });
        return dataRows;
    } catch (error) {
        console.error(`Direct fetch error for ${label}:`, error.message);
        try {
            const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
            console.log(`Trying proxy for ${label}:`, proxyUrl);
            const proxyResponse = await fetch(proxyUrl);
            if (!proxyResponse.ok) {
                console.error(`Proxy fetch failed for ${label}. Status: ${proxyResponse.status}, StatusText: ${proxyResponse.statusText}`);
                throw new Error(`Proxy error! Status: ${proxyResponse.status}`);
            }
            const text = await proxyResponse.text();
            console.log(`Proxy Raw ${label} data:`, text);
            const rows = text.trim().split("\n");
            const dataRows = rows.slice(1).map(row => {
                const columns = row.split(",");
                return columns[0].replace(/"/g, "").trim();
            });
            return dataRows;
        } catch (proxyError) {
            console.error(`Proxy fetch error for ${label}:`, proxyError.message);
            if (label === "Approved Users") return ["test@example.com"];
            if (label === "Contacts") return ["Unknown,1234567890"];
            return [];
        }
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
    console.log("Button clicked!");
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const userEmail = result.user.email;
            console.log("Logged in as:", userEmail);
            checkApprovedUser(userEmail);
        })
        .catch((error) => {
            console.error("Login error:", error);
            document.getElementById("auth-message").textContent = "Login failed: " + error.message;
        });
});

function checkApprovedUser(email) {
    console.log("Checking email:", email);
    console.log("Approved users list:", approvedUsers);
    const authMessage = document.getElementById("auth-message");
    const isApproved = approvedUsers.some(user => user.toLowerCase() === email.toLowerCase());
    console.log("Is approved?", isApproved);
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