const multer = require('multer');
const { EXT_BY_MIME } = require('../storage/localStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      const err = new Error('File harus berupa gambar (jpg, png, webp, gif)');
      err.isUploadFilter = true;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;
