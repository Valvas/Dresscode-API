'use strict';

module.exports = function(app) {
  require('./signIn')(app);
  require('./signUp')(app);
};
