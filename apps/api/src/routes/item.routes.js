const express = require('express');
const router = express.Router();
const { getAllItems, getItemById, createItem } = require('../controllers/item.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/', getAllItems);
router.get('/:id', getItemById);
router.post('/', requireAuth, createItem);

module.exports = router;