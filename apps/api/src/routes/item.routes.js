const express = require('express');
const router = express.Router();
const { getAllItems, getItemById } = require('../controllers/item.controller');

router.get('/', getAllItems);
router.get('/:id', getItemById);

module.exports = router;