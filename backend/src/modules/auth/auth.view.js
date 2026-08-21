const { formatUser } = require("../users/user.view");

function formatAuthResponse(user, token) {
  return {
    token,
    user: formatUser(user),
  };
}

module.exports = { formatAuthResponse };
