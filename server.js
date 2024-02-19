require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors'); 


const app = express();
const server = http.createServer(app);
const io = socketIO(server,{
    cors: {
        origin: "http://localhost:4200", // Replace with the origin of your Angular app
        methods: ["GET", "POST"]
    }
});


const generateRandomString = (length) => {
    return crypto.randomBytes(length).toString('hex');
};

const secretKey = generateRandomString(32); // You can adjust the length as needed

console.log(secretKey);
app.use(express.json());
app.use(cors());
app.get('/', (req, res) => {
    // Handle the request for the root URL
    res.send('Hello, World!');
});
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err)=> {
    if(err){
        console.log(err);
        console.error('Error connecting to MySQL database: ' + err.stack);
        return;
    }
    //console.log(db);
    console.log('Connected to MySQL as id ' + db.threadId)
});

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    socket.on('join',(data) =>{
        const { room, username, token } = data;
        
        // Verify the token
        //jwt.verify(token, secretKey, (err, decoded) => {
            /*if (err) {
                console.log(err);
            socket.emit('auth_error', 'Invalid token');
            return;
            }*/
    
            // Check if the user exists in the database
            db.query('SELECT * FROM users WHERE username = ? AND token = ?', [username, token], (err, rows) => {
            if (err) throw err;
    
            if (rows.length === 0) {
                socket.emit('auth_error', 'User not authorized');
                return;
            }
    
            socket.join(room);
            console.log(username + ' joined room ' + room);
            });
        //});

    });

    socket.on('message', (data) => {
        const { room, userId, message, token } = data;
    
        // Verify the token
        //jwt.verify(token, secretKey, (err, decoded) => {
          /*if (err) {
            socket.emit('auth_error', 'Invalid token');
            return;
          }*/
    
          // Check if the user exists in the database
          db.query('SELECT * FROM users WHERE token = ?', [token], (err, rows) => {
            if (err) throw err;
    
            if (rows.length === 0) {
              socket.emit('auth_error', 'User not authorized');
              return;
            }
    
            io.to(room).emit('message', { room, userId, message });
            const timestamp = new Date();
            db.query(
              'INSERT INTO messages (room, user_id, message, timestamp) VALUES (?, ?, ?, ?)',
              [room, userId, message, timestamp],
              (err, result) => {
                if (err) throw err;
              }
            );
          });
        //});
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});