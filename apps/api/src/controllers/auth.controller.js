module.exports = function createAuthController({ auth }) {
  return {
    async register(req, res) {
      const user = await auth.register(req.body);
      res.status(201).json({ success: true, data: user });
    },
    async login(req, res) {
      const data = await auth.login(req.body);
      res.json({ success: true, data });
    },
    async me(req, res) {
      res.json({ success: true, data: await auth.me(req.user.id) });
    },
    async updateMe(req, res) {
      res.json({ success: true, data: await auth.updateProfile(req.user.id, req.body) });
    },
  };
};
