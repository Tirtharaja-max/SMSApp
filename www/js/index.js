document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is ready, initialize app
    console.log('Cordova ready');
    window.emailjs.init("5RKCAEWj33pxKNyYz"); // Initialize EmailJS
    loadApp();
}

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
        if (label === "Approved Users") return ["tirtharaja@gmail.com"];
        if (label === "Contacts") return ["Unknown,9851087777"];
        return [];
    }
}

async function loadApp() {
    approvedUsers = await fetchSheetData(approvedUsersSheet, "Approved Users");
    console.log("Processed Approved Users:", approvedUsers);
    
    const contactRows = await fetchSheetData(contactsSheet, "Contacts");
    contacts = contactRows.map(row => {
        const parts = row.split(",");
        if (parts.length === 2) {
            return { name: parts[0] || "Unknown", phone: parts[1] || parts[0] };
        } else {
            return { name: "Unknown", phone: parts[0] };
        }
    });
    console.log("Processed Contacts:", contacts);
    loadContacts();
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

function sendVerificationEmail() {
    const email = document.getElementById("email-input").value.trim();
    const authMessage = document.getElementById("auth-message");

    console.log("Entered email:", email);
    if (!email) {
        authMessage.textContent = "Please enter an email.";
        return;
    }

    const isApproved = approvedUsers.some(user => user.toLowerCase() === email.toLowerCase());
    console.log("Is approved?", isApproved);
    if (!isApproved) {
        authMessage.textContent = "You are not an approved user.";
        return;
    }

    const verificationLink = "smsapp://auth?email=" + encodeURIComponent(email);
    const templateParams = {
        to_email: email,
        verification_link: verificationLink,
    };

    window.emailjs.send("service_oaq4yqs", "template_m56av0p", templateParams)
        .then(() => {
            authMessage.textContent = "Verification email sent! Check your inbox.";
            setTimeout(() => {
                document.getElementById("auth-section").style.display = "none";
                document.getElementById("app-section").style.display = "block";
                loadContacts();
            }, 2000);
        }, (error) => {
            authMessage.textContent = "Failed to send email: " + error.text;
        });
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

    // Use Cordova SMS plugin
    const options = {
        replaceLineBreaks: false, // Keep message as-is
        android: {
            intent: '' // Send SMS directly without opening app
        }
    };

    phones.forEach(phone => {
        window.sms.send(phone, message, options,
            () => {
                statusMessage.textContent = `SMS sent to ${phones.length} contact(s)!`;
            },
            (error) => {
                console.error("SMS Error:", error);
                statusMessage.textContent = "Error sending SMS: " + error;
            }
        );
    });
}
import emailjs from '@emailjs/browser';
window.emailjs = emailjs; // Make it globally available