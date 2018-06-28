'use strict';

module.exports = (app) =>
{
  require('./addElement')(app);
  require('./getAllElements')(app);
  require('./getUserData')(app);
  require('./deleteElement')(app);
  require('./changeNames')(app);
  require('./changeEmailAddress')(app);
  require('./changePassword')(app);
};
