class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

const badRequest = (msg, code) => new AppError(400, msg, code || 'BAD_REQUEST');
const unauthorized = (msg = 'Tidak terautentikasi') => new AppError(401, msg, 'UNAUTHORIZED');
const forbidden = (msg = 'Tidak punya akses') => new AppError(403, msg, 'FORBIDDEN');
const notFound = (msg = 'Data tidak ditemukan') => new AppError(404, msg, 'NOT_FOUND');
const conflict = (msg, code) => new AppError(409, msg, code || 'CONFLICT');

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
