const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'blood-donation-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.userId && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
};

// Routes

// Auth routes
app.post('/api/register', (req, res) => {
    const { username, password, email, full_name, phone, blood_group } = req.body;
    
    if (!username || !password || !email || !full_name || !blood_group) {
        return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        `INSERT INTO users (username, password, email, full_name, phone, blood_group) VALUES (?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, email, full_name, phone, blood_group],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            res.json({ success: true, message: 'Registration successful' });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Login failed' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.fullName = user.full_name;
            
            res.json({ 
                success: true, 
                role: user.role,
                username: user.username,
                fullName: user.full_name
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            loggedIn: true,
            userId: req.session.userId,
            username: req.session.username,
            role: req.session.role,
            fullName: req.session.fullName
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Donor routes
app.post('/api/donors', requireAuth, (req, res) => {
    const { blood_group, age, weight, last_donation_date, address, city, state, medical_conditions } = req.body;
    
    // Check if user already registered as donor
    db.get('SELECT * FROM donors WHERE user_id = ?', [req.session.userId], (err, existing) => {
        if (existing) {
            return res.status(400).json({ error: 'You are already registered as a donor' });
        }

        db.run(
            `INSERT INTO donors (user_id, blood_group, age, weight, last_donation_date, address, city, state, medical_conditions) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.userId, blood_group, age, weight, last_donation_date || null, address, city, state, medical_conditions || ''],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to register as donor' });
                }
                res.json({ success: true, message: 'Successfully registered as donor' });
            }
        );
    });
});

app.get('/api/donors', requireAuth, (req, res) => {
    const { blood_group, city } = req.query;
    let query = `SELECT d.*, u.full_name, u.email, u.phone 
                 FROM donors d 
                 JOIN users u ON d.user_id = u.id 
                 WHERE d.available = 1`;
    const params = [];

    if (blood_group) {
        query += ' AND d.blood_group = ?';
        params.push(blood_group);
    }
    if (city) {
        query += ' AND d.city LIKE ?';
        params.push(`%${city}%`);
    }

    query += ' ORDER BY d.created_at DESC';

    db.all(query, params, (err, donors) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch donors' });
        }
        res.json(donors);
    });
});

app.get('/api/donors/my', requireAuth, (req, res) => {
    db.get(
        `SELECT d.*, u.full_name, u.email, u.phone 
         FROM donors d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.user_id = ?`,
        [req.session.userId],
        (err, donor) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch donor info' });
            }
            res.json(donor || null);
        }
    );
});

app.put('/api/donors/:id', requireAuth, (req, res) => {
    const { available, last_donation_date, address, city, state } = req.body;
    
    db.run(
        `UPDATE donors SET available = ?, last_donation_date = ?, address = ?, city = ?, state = ? 
         WHERE id = ? AND user_id = ?`,
        [available, last_donation_date, address, city, state, req.params.id, req.session.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update donor info' });
            }
            res.json({ success: true, message: 'Donor info updated' });
        }
    );
});

// Blood request routes
app.post('/api/blood-requests', requireAuth, (req, res) => {
    const { blood_group, units_needed, urgency, hospital_name, hospital_address, city, contact_number, reason } = req.body;

    db.run(
        `INSERT INTO blood_requests (requester_id, blood_group, units_needed, urgency, hospital_name, hospital_address, city, contact_number, reason) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.session.userId, blood_group, units_needed, urgency, hospital_name, hospital_address, city, contact_number, reason || ''],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create blood request' });
            }
            res.json({ success: true, message: 'Blood request created successfully' });
        }
    );
});

app.get('/api/blood-requests', requireAuth, (req, res) => {
    const query = `SELECT br.*, u.full_name as requester_name, u.email as requester_email 
                   FROM blood_requests br 
                   JOIN users u ON br.requester_id = u.id 
                   ORDER BY br.created_at DESC`;

    db.all(query, [], (err, requests) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch blood requests' });
        }
        res.json(requests);
    });
});

app.get('/api/blood-requests/my', requireAuth, (req, res) => {
    db.all(
        `SELECT * FROM blood_requests WHERE requester_id = ? ORDER BY created_at DESC`,
        [req.session.userId],
        (err, requests) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch your requests' });
            }
            res.json(requests);
        }
    );
});

app.put('/api/blood-requests/:id', requireAuth, (req, res) => {
    const { status } = req.body;
    
    db.run(
        `UPDATE blood_requests SET status = ? WHERE id = ? AND requester_id = ?`,
        [status, req.params.id, req.session.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update request' });
            }
            res.json({ success: true, message: 'Request updated' });
        }
    );
});

// Contact donor routes
app.post('/api/contact-donor', requireAuth, (req, res) => {
    const { donor_id, message, sender_contact } = req.body;

    db.run(
        `INSERT INTO contact_messages (sender_id, donor_id, message, sender_contact) VALUES (?, ?, ?, ?)`,
        [req.session.userId, donor_id, message, sender_contact],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to send message' });
            }
            res.json({ success: true, message: 'Message sent to donor' });
        }
    );
});

app.get('/api/contact-messages/received', requireAuth, (req, res) => {
    db.all(
        `SELECT cm.*, u.full_name as sender_name, u.email as sender_email 
         FROM contact_messages cm 
         JOIN users u ON cm.sender_id = u.id 
         JOIN donors d ON cm.donor_id = d.id 
         WHERE d.user_id = ? 
         ORDER BY cm.created_at DESC`,
        [req.session.userId],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch messages' });
            }
            res.json(messages);
        }
    );
});

// Admin routes
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"', [], (err, result) => {
        stats.totalUsers = result ? result.count : 0;

        db.get('SELECT COUNT(*) as count FROM donors', [], (err, result) => {
            stats.totalDonors = result ? result.count : 0;

            db.get('SELECT COUNT(*) as count FROM blood_requests', [], (err, result) => {
                stats.totalRequests = result ? result.count : 0;

                db.get('SELECT COUNT(*) as count FROM blood_requests WHERE status = "pending"', [], (err, result) => {
                    stats.pendingRequests = result ? result.count : 0;

                    res.json(stats);
                });
            });
        });
    });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
    db.all('SELECT id, username, email, full_name, phone, blood_group, role, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(users);
    });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM users WHERE id = ? AND role != "admin"', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }
        res.json({ success: true, message: 'User deleted' });
    });
});

app.get('/api/admin/donors', requireAdmin, (req, res) => {
    db.all(
        `SELECT d.*, u.full_name, u.email, u.phone, u.username 
         FROM donors d 
         JOIN users u ON d.user_id = u.id 
         ORDER BY d.created_at DESC`,
        [],
        (err, donors) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch donors' });
            }
            res.json(donors);
        }
    );
});

app.delete('/api/admin/donors/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM donors WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete donor' });
        }
        res.json({ success: true, message: 'Donor deleted' });
    });
});

app.put('/api/admin/blood-requests/:id', requireAdmin, (req, res) => {
    const { status } = req.body;
    
    db.run(
        `UPDATE blood_requests SET status = ? WHERE id = ?`,
        [status, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update request' });
            }
            res.json({ success: true, message: 'Request updated' });
        }
    );
});

app.delete('/api/admin/blood-requests/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM blood_requests WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete request' });
        }
        res.json({ success: true, message: 'Request deleted' });
    });
});

app.get('/api/admin/messages', requireAdmin, (req, res) => {
    db.all(
        `SELECT cm.*, 
                u1.full_name as sender_name, u1.email as sender_email,
                u2.full_name as donor_name, u2.email as donor_email
         FROM contact_messages cm 
         JOIN users u1 ON cm.sender_id = u1.id 
         JOIN donors d ON cm.donor_id = d.id
         JOIN users u2 ON d.user_id = u2.id
         ORDER BY cm.created_at DESC`,
        [],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch messages' });
            }
            res.json(messages);
        }
    );
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/user-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Blood Donation System running on http://localhost:${PORT}`);
    console.log('Default admin credentials: username: admin, password: admin123');
});
