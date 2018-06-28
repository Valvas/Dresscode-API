'use strict'

const messages    = require('../messages');
const functions   = require('../functions');
const bcrypt      = require('bcrypt');
const params      = require('../params');

module.exports = (app) =>
{
  app.post('/changePassword', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.oldPassword == undefined) res.status(406).send({ message: messages.MISSING_OLD_PASSWORD, detail: null });

    else if(req.body.newPassword == undefined) res.status(406).send({ message: messages.MISSING_NEW_PASSWORD, detail: null });

    else
    {
      functions.getEmailFromToken(req.headers.authorization, (error, email) =>
      {
        if(error != null) res.status(error.status).send({ message: error.message, detail: error.detail });

        else
        {
          req.app.get('pool').getConnection((error, connection) =>
          {
            if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

            else
            {
              functions.getAccountFromEmail(email, connection, (error, account) =>
              {
                if(error != null) res.status(error.status).send({ message: error.message, detail: error.detail });

                else
                {
                  connection.query(`SELECT PASSWORD from users where USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {

                      bcrypt.hash(req.body.oldPassword, params.salt, (error, encryptedPassword) =>
                      {
                          if(error) res.status(500).send({ message: messages.ENCRYPTION_ERROR, detail: error.message });

                          else if(encryptedPassword !== result[0].PASSWORD)
                          {
                            res.status(406).send({ message: messages.INCORECT_OLD_PASSWORD, detail: null });
                          }

                          else
                          {
                            bcrypt.hash(req.body.newPassword, params.salt, (error, encryptedNewPassword) =>
                            {
                              connection.query(`UPDATE users set PASSWORD = "${encryptedNewPassword}" WHERE USER_ID = "${account.USER_ID}"`, (error, resultUpdate) =>
                              {
                                connection.release();
                                if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                                else
                                {
                                  res.status(201).send({ message: messages.WARDROBE_PASSWORD_CHANGED });
                                }
                              });
                            });
                          }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};
