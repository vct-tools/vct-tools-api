module.exports = {
  formatResponse(status, data, error = null) {
    if (error) {
      return {
        status,
        error,
        data
      };
    } else {
      return {
        status,
        data
      };
    }
  }
};
