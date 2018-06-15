'use strict';

module.exports = (app) => 
{
  require('./signIn')(app);
  require('./signUp')(app);
  require('./token')(app);
};
