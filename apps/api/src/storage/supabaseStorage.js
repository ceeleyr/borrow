const crypto = require('crypto');
const { EXT_BY_MIME } = require('./localStorage');

const BUCKET = 'item-images';

function createSupabaseStorage(client) {
  return {
    async saveImage({ itemId, buffer, mimetype }) {
      const ext = EXT_BY_MIME[mimetype];
      if (!ext) throw new Error('Tipe gambar tidak didukung');
      const fileName = `${itemId}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const { error } = await client.storage.from(BUCKET).upload(fileName, buffer, {
        contentType: mimetype,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data } = client.storage.from(BUCKET).getPublicUrl(fileName);
      return { path: data.publicUrl, isRelative: false };
    },
  };
}

module.exports = { createSupabaseStorage };
