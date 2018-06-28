'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

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
                  connection.query(`UPDATE users set MAIL = "${req.body.email}" where USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    connection.release();
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      res.status(201).send({ message: messages.WARDROBE_EMAIL_ADDRESS_CHANGED });
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
