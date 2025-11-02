// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login';
            return;
        }
        
        if (data.role === 'admin') {
            window.location.href = '/admin-dashboard';
            return;
        }
        
        document.getElementById('user-name').textContent = `Hello, ${data.fullName}`;
        loadDashboardData();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login';
    }
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Tab navigation
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.closest('.menu-item').classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'find-donors') {
        searchDonors();
    } else if (tabName === 'blood-requests') {
        loadAllRequests();
    } else if (tabName === 'my-requests') {
        loadMyRequests();
    } else if (tabName === 'messages') {
        loadMessages();
    } else if (tabName === 'donor-registration') {
        loadDonorInfo();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load donor status
        const donorResponse = await fetch('/api/donors/my');
        const donorData = await donorResponse.json();
        
        if (donorData) {
            document.getElementById('donor-status').textContent = 'Registered';
        }
        
        // Load my requests count
        const requestsResponse = await fetch('/api/blood-requests/my');
        const requestsData = await requestsResponse.json();
        document.getElementById('my-requests-count').textContent = requestsData.length;
        
        // Load messages count
        const messagesResponse = await fetch('/api/contact-messages/received');
        const messagesData = await messagesResponse.json();
        document.getElementById('messages-count').textContent = messagesData.length;
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Donor registration
async function loadDonorInfo() {
    try {
        const response = await fetch('/api/donors/my');
        const donor = await response.json();
        
        if (donor) {
            document.getElementById('donor-info-display').style.display = 'block';
            document.getElementById('donor-registration-form-container').style.display = 'none';
            
            const detailsHtml = `
                <p><strong>Blood Group:</strong> ${donor.blood_group}</p>
                <p><strong>Age:</strong> ${donor.age}</p>
                <p><strong>Weight:</strong> ${donor.weight} kg</p>
                <p><strong>Last Donation:</strong> ${donor.last_donation_date || 'Never'}</p>
                <p><strong>Address:</strong> ${donor.address}</p>
                <p><strong>City:</strong> ${donor.city}</p>
                <p><strong>State:</strong> ${donor.state}</p>
                <p><strong>Status:</strong> ${donor.available ? 'Available' : 'Not Available'}</p>
            `;
            document.getElementById('donor-details').innerHTML = detailsHtml;
        } else {
            document.getElementById('donor-info-display').style.display = 'none';
            document.getElementById('donor-registration-form-container').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load donor info:', error);
    }
}

document.getElementById('donor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        blood_group: document.getElementById('donor-blood-group').value,
        age: parseInt(document.getElementById('donor-age').value),
        weight: parseFloat(document.getElementById('donor-weight').value),
        last_donation_date: document.getElementById('last-donation').value || null,
        address: document.getElementById('donor-address').value,
        city: document.getElementById('donor-city').value,
        state: document.getElementById('donor-state').value,
        medical_conditions: document.getElementById('medical-conditions').value
    };
    
    try {
        const response = await fetch('/api/donors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        const messageDiv = document.getElementById('donor-message');
        
        if (response.ok) {
            messageDiv.className = 'message success-message';
            messageDiv.textContent = data.message;
            messageDiv.style.display = 'block';
            setTimeout(() => {
                loadDonorInfo();
                loadDashboardData();
            }, 2000);
        } else {
            messageDiv.className = 'message error-message';
            messageDiv.textContent = data.error;
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to register as donor:', error);
    }
});

// Search donors
async function searchDonors() {
    const bloodGroup = document.getElementById('search-blood-group').value;
    const city = document.getElementById('search-city').value;
    
    let url = '/api/donors?';
    if (bloodGroup) url += `blood_group=${bloodGroup}&`;
    if (city) url += `city=${city}&`;
    
    try {
        const response = await fetch(url);
        const donors = await response.json();
        
        const donorsList = document.getElementById('donors-list');
        
        if (donors.length === 0) {
            donorsList.innerHTML = '<p class="no-data">No donors found matching your criteria.</p>';
            return;
        }
        
        donorsList.innerHTML = donors.map(donor => `
            <div class="donor-card">
                <div class="donor-header">
                    <div class="blood-badge-large">${donor.blood_group}</div>
                    <h3>${donor.full_name}</h3>
                </div>
                <div class="donor-info">
                    <p><strong>Age:</strong> ${donor.age} years</p>
                    <p><strong>City:</strong> ${donor.city}, ${donor.state}</p>
                    <p><strong>Last Donation:</strong> ${donor.last_donation_date || 'Never'}</p>
                    <p><strong>Phone:</strong> ${donor.phone || 'Not provided'}</p>
                    <p><strong>Email:</strong> ${donor.email}</p>
                </div>
                <button class="btn btn-primary btn-small" onclick="openContactModal(${donor.id})">
                    Contact Donor
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to search donors:', error);
    }
}

// Contact donor modal
function openContactModal(donorId) {
    document.getElementById('contact-donor-id').value = donorId;
    document.getElementById('contact-modal').style.display = 'block';
}

function closeContactModal() {
    document.getElementById('contact-modal').style.display = 'none';
    document.getElementById('contact-form').reset();
}

document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        donor_id: document.getElementById('contact-donor-id').value,
        message: document.getElementById('contact-message').value,
        sender_contact: document.getElementById('sender-contact').value
    };
    
    try {
        const response = await fetch('/api/contact-donor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Message sent successfully!');
            closeContactModal();
        } else {
            alert('Failed to send message: ' + data.error);
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        alert('An error occurred while sending the message.');
    }
});

// Blood requests
document.getElementById('blood-request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        blood_group: document.getElementById('request-blood-group').value,
        units_needed: parseInt(document.getElementById('units-needed').value),
        urgency: document.getElementById('urgency').value,
        hospital_name: document.getElementById('hospital-name').value,
        hospital_address: document.getElementById('hospital-address').value,
        city: document.getElementById('request-city').value,
        contact_number: document.getElementById('contact-number').value,
        reason: document.getElementById('reason').value
    };
    
    try {
        const response = await fetch('/api/blood-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        const messageDiv = document.getElementById('request-message');
        
        if (response.ok) {
            messageDiv.className = 'message success-message';
            messageDiv.textContent = data.message;
            messageDiv.style.display = 'block';
            document.getElementById('blood-request-form').reset();
            setTimeout(() => {
                loadAllRequests();
                loadMyRequests();
                loadDashboardData();
            }, 2000);
        } else {
            messageDiv.className = 'message error-message';
            messageDiv.textContent = data.error;
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to create blood request:', error);
    }
});

async function loadAllRequests() {
    try {
        const response = await fetch('/api/blood-requests');
        const requests = await response.json();
        
        const requestsList = document.getElementById('all-requests-list');
        
        if (requests.length === 0) {
            requestsList.innerHTML = '<p class="no-data">No blood requests available.</p>';
            return;
        }
        
        requestsList.innerHTML = requests.map(request => `
            <div class="request-card ${request.urgency}">
                <div class="request-header">
                    <div class="blood-badge-large">${request.blood_group}</div>
                    <div>
                        <h3>${request.hospital_name}</h3>
                        <span class="urgency-badge ${request.urgency}">${request.urgency.toUpperCase()}</span>
                    </div>
                </div>
                <div class="request-info">
                    <p><strong>Units Needed:</strong> ${request.units_needed}</p>
                    <p><strong>Hospital:</strong> ${request.hospital_address}, ${request.city}</p>
                    <p><strong>Contact:</strong> ${request.contact_number}</p>
                    <p><strong>Requester:</strong> ${request.requester_name}</p>
                    ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
                    <p><strong>Status:</strong> <span class="status-badge ${request.status}">${request.status}</span></p>
                    <p class="request-date">Posted: ${new Date(request.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load requests:', error);
    }
}

async function loadMyRequests() {
    try {
        const response = await fetch('/api/blood-requests/my');
        const requests = await response.json();
        
        const requestsList = document.getElementById('my-requests-list');
        
        if (requests.length === 0) {
            requestsList.innerHTML = '<p class="no-data">You have not created any blood requests yet.</p>';
            return;
        }
        
        requestsList.innerHTML = requests.map(request => `
            <div class="request-card ${request.urgency}">
                <div class="request-header">
                    <div class="blood-badge-large">${request.blood_group}</div>
                    <div>
                        <h3>${request.hospital_name}</h3>
                        <span class="urgency-badge ${request.urgency}">${request.urgency.toUpperCase()}</span>
                    </div>
                </div>
                <div class="request-info">
                    <p><strong>Units Needed:</strong> ${request.units_needed}</p>
                    <p><strong>Hospital:</strong> ${request.hospital_address}, ${request.city}</p>
                    <p><strong>Contact:</strong> ${request.contact_number}</p>
                    ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
                    <p><strong>Status:</strong> <span class="status-badge ${request.status}">${request.status}</span></p>
                    <p class="request-date">Posted: ${new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div class="request-actions">
                    <button class="btn btn-small" onclick="updateRequestStatus(${request.id}, 'fulfilled')">Mark as Fulfilled</button>
                    <button class="btn btn-small btn-danger" onclick="updateRequestStatus(${request.id}, 'cancelled')">Cancel</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load my requests:', error);
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        const response = await fetch(`/api/blood-requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadMyRequests();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Failed to update request:', error);
    }
}

// Messages
async function loadMessages() {
    try {
        const response = await fetch('/api/contact-messages/received');
        const messages = await response.json();
        
        const messagesList = document.getElementById('messages-list');
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p class="no-data">No messages received yet.</p>';
            return;
        }
        
        messagesList.innerHTML = messages.map(message => `
            <div class="message-card ${message.status}">
                <div class="message-header">
                    <h3>From: ${message.sender_name}</h3>
                    <span class="message-date">${new Date(message.created_at).toLocaleString()}</span>
                </div>
                <div class="message-body">
                    <p>${message.message}</p>
                </div>
                <div class="message-footer">
                    <p><strong>Contact:</strong> ${message.sender_contact}</p>
                    <p><strong>Email:</strong> ${message.sender_email}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

// Initialize
checkAuth();
