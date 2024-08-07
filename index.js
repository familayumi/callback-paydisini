const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const { User, Deposit } = require('./models');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Koneksi ke MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Endpoint untuk menerima callback dari PayDisini
app.post('/callback', async (req, res) => {
  const { unique_code, status } = req.body;

  try {
    const deposit = await Deposit.findOne({ uniqueCode: unique_code });
    if (!deposit) {
      return res.status(404).send('Deposit not found');
    }

    if (status === 'paid') {
      deposit.status = 'completed';
      const user = await User.findOne({ userId: deposit.userId });
      user.saldo += deposit.amount;
      await user.save();

      // Kirim pesan ke bot menggunakan bot token
      const chatId = deposit.userId;
      const message = `DEPOSIT BERHASIL! Saldo Anda sekarang adalah Rp ${user.saldo}`;
      const botToken = process.env.BOT_TOKEN;
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
      });
    } else {
      deposit.status = 'failed';
    }
    await deposit.save();

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Jalankan server express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server is running on port ${PORT}`);
});
