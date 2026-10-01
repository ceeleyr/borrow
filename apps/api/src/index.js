const express = require('express');
const cors = require('cors');
const { port } = require('./config/env');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');
const authRoutes = require('./routes/auth.routes');
const borrowRoutes = require('./routes/borrow.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/borrow-requests', borrowRoutes);

app.listen(port, () => {
  console.log(`Server jalan di http://localhost:${port}`);
});