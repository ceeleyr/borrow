const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Simpan gambar ke disk lokal (mode demo). URL publik dibentuk controller dari host request. */
function createLocalStorage(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    async saveImage({ itemId, buffer, mimetype }) {
      const ext = EXT_BY_MIME[mimetype];
      if (!ext) throw new Error('Tipe gambar tidak didukung');
      const name = `${itemId}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      await fs.promises.writeFile(path.join(dir, name), buffer);
      return { path: `/uploads/${name}`, isRelative: true };
    },
  };
}

module.exports = { createLocalStorage, EXT_BY_MIME };
