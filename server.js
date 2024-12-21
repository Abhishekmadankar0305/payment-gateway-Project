// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Setup express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Schemas and Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    upiId: { type: String, unique: true },
    balance: { type: Number, default: 1000 },
});

const transactionSchema = new mongoose.Schema({
    senderUpiId: { type: String, required: true },
    receiverUpiId: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Helper function to generate unique UPI ID
const generateUPI = () => {
    return crypto.randomBytes(8).toString('hex') + '@example';
};

// API Endpoints

// Sign-up route
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const upiId = generateUPI();
        const user = new User({ name, email, password, upiId });
        await user.save();

        res.status(201).json({ message: 'User registered successfully', upiId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({ message: 'Login successful', upiId: user.upiId, balance: user.balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Transaction route
app.post('/api/transaction', async (req, res) => {
    const { senderUpiId, receiverUpiId, amount } = req.body;

    if (!senderUpiId || !receiverUpiId || !amount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const sender = await User.findOne({ upiId: senderUpiId });
        const receiver = await User.findOne({ upiId: receiverUpiId });

        if (!sender || !receiver) {
            return res.status(404).json({ error: 'Sender or receiver not found' });
        }

        if (sender.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Perform transaction
        sender.balance -= amount;
        receiver.balance += amount;

        await sender.save();
        await receiver.save();

        const transaction = new Transaction({ senderUpiId, receiverUpiId, amount });
        await transaction.save();

        res.status(200).json({ message: 'Transaction successful', transaction });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing transaction' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
