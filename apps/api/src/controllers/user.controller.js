const getAllUsers = (req, res) => {
  res.json({ message: 'Berhasil ambil semua user', data: [] });
};

const getUserById = (req, res) => {
  const { id } = req.params;
  res.json({ message: `Detail user dengan id ${id}` });
};

module.exports = { getAllUsers, getUserById };