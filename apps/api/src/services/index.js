const { createAuthService } = require('./authService');
const { createCategoryService } = require('./categoryService');
const { createItemService } = require('./itemService');
const { createBorrowService } = require('./borrowService');
const { createAdminService } = require('./adminService');

function createServices({ repos, authProvider, clock }) {
  return {
    auth: createAuthService({ profiles: repos.profiles, authProvider }),
    categories: createCategoryService({ categories: repos.categories }),
    items: createItemService({ items: repos.items, borrows: repos.borrows, categories: repos.categories }),
    borrows: createBorrowService({ borrows: repos.borrows, items: repos.items, clock }),
    admin: createAdminService({
      profiles: repos.profiles,
      items: repos.items,
      borrows: repos.borrows,
      authProvider,
      clock,
    }),
  };
}

module.exports = { createServices };
