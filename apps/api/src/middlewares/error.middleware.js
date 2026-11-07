const multer = require('multer');
const { AppError } = require('../lib/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 5MB' : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Body JSON tidak valid' });
  }
  if (err?.isUploadFilter) {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error('[unhandled]', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
}

module.exports = { notFoundHandler, errorHandler };
