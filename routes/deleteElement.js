'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.delete('/deleteElement', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.elementId == undefined) res.status(406).send({ message: messages.MISSING_ID, detail: null });

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
                  connection.query(`DELETE FROM element WHERE USER_ID = ${account.USER_ID} and ELEMENT_ID = ${req.body.elementId}`, (error) =>
                  {
                    connection.release();
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      res.status(201).send({ message: messages.WARDROBE_ELEMENT_DELETED })
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
