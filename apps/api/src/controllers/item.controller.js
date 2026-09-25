const getAllItems = (req, res) => {
  res.json({ message: 'Berhasil ambil semua item', data: [] });
};

const getItemById = (req, res) => {
  const { id } = req.params;
  res.json({ message: `Detail item dengan id ${id}` });
};

module.exports = { getAllItems, getItemById };