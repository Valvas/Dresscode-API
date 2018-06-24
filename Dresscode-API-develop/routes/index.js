'use strict';

module.exports = (app) =>
{
  require('./addElement')(app);
  require('./getAllElements')(app);
  require('./getUserData')(app);
};
