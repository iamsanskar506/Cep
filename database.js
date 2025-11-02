const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'blood_donation.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            blood_group TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Donors table
        db.run(`CREATE TABLE IF NOT EXISTS donors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            blood_group TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight REAL NOT NULL,
            last_donation_date DATE,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            available BOOLEAN DEFAULT 1,
            medical_conditions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Blood requests table
        db.run(`CREATE TABLE IF NOT EXISTS blood_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id INTEGER NOT NULL,
            blood_group TEXT NOT NULL,
            units_needed INTEGER NOT NULL,
            urgency TEXT NOT NULL,
            hospital_name TEXT NOT NULL,
            hospital_address TEXT NOT NULL,
            city TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (requester_id) REFERENCES users(id)
        )`);

        // Contact messages table
        db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            donor_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            sender_contact TEXT NOT NULL,
            status TEXT DEFAULT 'unread',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (donor_id) REFERENCES donors(id)
        )`);

        // Create default admin user
        const adminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, email, full_name, blood_group, role) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            ['admin', adminPassword, 'admin@blooddonation.com', 'System Administrator', 'O+', 'admin'],
            (err) => {
                if (err && !err.message.includes('UNIQUE constraint')) {
                    console.error('Error creating admin user:', err.message);
                } else if (!err) {
                    console.log('Default admin user created (username: admin, password: admin123)');
                }
            }
        );
    });
}

module.exports = db;
