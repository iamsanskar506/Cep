// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login';
            return;
        }
        
        if (data.role !== 'admin') {
            window.location.href = '/user-dashboard';
            return;
        }
        
        document.getElementById('admin-name').textContent = `Admin: ${data.fullName}`;
        loadDashboardStats();
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
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'donors') {
        loadDonors();
    } else if (tabName === 'requests') {
        loadRequests();
    } else if (tabName === 'messages') {
        loadMessages();
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('total-donors').textContent = stats.totalDonors;
        document.getElementById('total-requests').textContent = stats.totalRequests;
        document.getElementById('pending-requests').textContent = stats.pendingRequests;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        
        const tbody = document.getElementById('users-table-body');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data">No users found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="blood-badge">${user.blood_group}</span></td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    ${user.role !== 'admin' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})">Delete</button>` 
                        : '<span class="text-muted">Protected</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('User deleted successfully');
            loadUsers();
            loadDashboardStats();
        } else {
            alert('Failed to delete user');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        alert('An error occurred while deleting the user');
    }
}

// Load donors
async function loadDonors() {
    try {
        const response = await fetch('/api/admin/donors');
        const donors = await response.json();
        
        const tbody = document.getElementById('donors-table-body');
        
        if (donors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="no-data">No donors found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = donors.map(donor => `
            <tr>
                <td>${donor.id}</td>
                <td>${donor.full_name}</td>
                <td>${donor.username}</td>
                <td><span class="blood-badge">${donor.blood_group}</span></td>
                <td>${donor.age}</td>
                <td>${donor.weight} kg</td>
                <td>${donor.city}</td>
                <td>${donor.state}</td>
                <td><span class="status-badge ${donor.available ? 'available' : 'unavailable'}">
                    ${donor.available ? 'Available' : 'Unavailable'}
                </span></td>
                <td>${donor.last_donation_date || 'Never'}</td>
                <td>
                    <button class="btn btn-small btn-danger" onclick="deleteDonor(${donor.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load donors:', error);
    }
}

async function deleteDonor(donorId) {
    if (!confirm('Are you sure you want to delete this donor registration?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/donors/${donorId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Donor deleted successfully');
            loadDonors();
            loadDashboardStats();
        } else {
            alert('Failed to delete donor');
        }
    } catch (error) {
        console.error('Failed to delete donor:', error);
        alert('An error occurred while deleting the donor');
    }
}

// Load requests
async function loadRequests() {
    try {
        const response = await fetch('/api/blood-requests');
        const requests = await response.json();
        
        const requestsList = document.getElementById('requests-list');
        
        if (requests.length === 0) {
            requestsList.innerHTML = '<p class="no-data">No blood requests found.</p>';
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
                    <p><strong>Request ID:</strong> ${request.id}</p>
                    <p><strong>Requester:</strong> ${request.requester_name} (${request.requester_email})</p>
                    <p><strong>Units Needed:</strong> ${request.units_needed}</p>
                    <p><strong>Hospital:</strong> ${request.hospital_address}, ${request.city}</p>
                    <p><strong>Contact:</strong> ${request.contact_number}</p>
                    ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
                    <p><strong>Status:</strong> <span class="status-badge ${request.status}">${request.status}</span></p>
                    <p class="request-date">Posted: ${new Date(request.created_at).toLocaleString()}</p>
                </div>
                <div class="request-actions">
                    <select onchange="updateRequestStatus(${request.id}, this.value)" class="status-select">
                        <option value="">Change Status</option>
                        <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="approved" ${request.status === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="fulfilled" ${request.status === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
                        <option value="cancelled" ${request.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button class="btn btn-small btn-danger" onclick="deleteRequest(${request.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load requests:', error);
    }
}

async function updateRequestStatus(requestId, status) {
    if (!status) return;
    
    try {
        const response = await fetch(`/api/admin/blood-requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            alert('Request status updated successfully');
            loadRequests();
            loadDashboardStats();
        } else {
            alert('Failed to update request status');
        }
    } catch (error) {
        console.error('Failed to update request:', error);
        alert('An error occurred while updating the request');
    }
}

async function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this blood request?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/blood-requests/${requestId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Request deleted successfully');
            loadRequests();
            loadDashboardStats();
        } else {
            alert('Failed to delete request');
        }
    } catch (error) {
        console.error('Failed to delete request:', error);
        alert('An error occurred while deleting the request');
    }
}

// Load messages
async function loadMessages() {
    try {
        const response = await fetch('/api/admin/messages');
        const messages = await response.json();
        
        const tbody = document.getElementById('messages-table-body');
        
        if (messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No messages found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = messages.map(message => `
            <tr>
                <td>${message.id}</td>
                <td>${message.sender_name}<br><small>${message.sender_email}</small></td>
                <td>${message.donor_name}<br><small>${message.donor_email}</small></td>
                <td class="message-text">${message.message}</td>
                <td>${message.sender_contact}</td>
                <td><span class="status-badge ${message.status}">${message.status}</span></td>
                <td>${new Date(message.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

// Initialize
checkAuth();
