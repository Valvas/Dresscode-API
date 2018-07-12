'use strict'

const messages    = require('../messages');
const functions   = require('../functions');
const jwt           = require('jsonwebtoken');
const params        = require('../params');

module.exports = (app) =>
{
  app.post('/changeEmailAddress', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.email == undefined) res.status(406).send({ message: messages.MISSING_EMAIL_ADDRESS, detail: null });

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
                  if(new RegExp("^[a-zA-Z][\\w\\.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\\w\\.-]*[a-zA-Z0-9]\\.[a-zA-Z][a-zA-Z\\.]*[a-zA-Z]$").test(req.body.email) == false)
                  {
                      res.status(406).send({ message: messages.INCORRECT_EMAIL_ADDRESS_FORMAT, detail: null });
                  }

                  else
                  {
                    connection.query(`SELECT * FROM users WHERE MAIL = "${req.body.email}"`, (errorSelect, result) =>
                    {
                      if(errorSelect) res.status(500).send({ message: messages.DATABASE_ERROR, detail: errorSelect.message });

                      else if(result.length > 0)
                      {
                          res.status(406).send({ message: messages.EMAIL_ADDRESS_NOT_AVAILABLE, detail: null });
                      }

                      else
                      {
                        connection.query(`UPDATE users set MAIL = "${req.body.email}" where USER_ID = ${account.USER_ID}`, (errorUpdate, resultUpdate) =>
                        {
                          connection.release();
                          if(errorUpdate) res.status(500).send({ message: messages.DATABASE_ERROR, detail: errorUpdate.message });

                          else
                          {
                            createToken(req.body.email, req, res);
                          }
                        });
                      }
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
  });

  function createToken(email, req, res)
  {
    jwt.sign({ email: email }, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
    {
        if(error) res.status(500).send({ message: messages.TOKEN_CREATION_ERROR, detail: error.message });

        else
        {
            res.status(201).send({ token: token,
                                   message: messages.WARDROBE_EMAIL_ADDRESS_CHANGED
                                });
        }
    });
  }
};
