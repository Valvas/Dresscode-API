'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.get('/getUserData', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

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
                  connection.query(`SELECT * FROM users WHERE USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    connection.release();
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      if(result[0] == undefined)
                      {
                        res.status(406).send({ message: messages.ACCOUNT_DOES_NOT_EXIST });
                      }
                      else
                      {
                        var user = {
                          user_id: result[0].USER_ID,
                          email: result[0].MAIL,
                          firstname: result[0].FIRSTNAME,
                          lastname: result[0].LASTNAME
                        };
                        res.status(200).send({ user: user });
                      }
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
