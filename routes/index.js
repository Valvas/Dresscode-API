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
  require('./getElementDetails')(app);
  require('./addOutfit')(app);
  require('./getAllOutfits')(app);
  require('./deleteOutfit')(app);
  require('./updateElement')(app);
  require('./updateOutfit')(app);
  require('./searchElement')(app);
  require('./searchOutfit')(app);
};
