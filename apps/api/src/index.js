const express = require('express');
const cors = require('cors');
const { port } = require('./config/env');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);

app.listen(port, () => {
  console.log(`Server jalan di http://localhost:${port}`);
});