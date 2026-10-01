const express = require('express');
const router = express.Router();
const {
  getAllItems, getItemById, createItem, updateItem, deleteItem, uploadItemImage,
} = require('../controllers/item.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', getAllItems);
router.get('/:id', getItemById);
router.post('/', requireAuth, createItem);
router.put('/:id', requireAuth, updateItem);
router.delete('/:id', requireAuth, deleteItem);
router.post('/:id/image', requireAuth, upload.single('image'), uploadItemImage);

module.exports = router;