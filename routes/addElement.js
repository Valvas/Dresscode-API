'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/addElement', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.type == undefined) res.status(406).send({ message: messages.MISSING_TYPE, detail: null });

    else if(req.body.color == undefined) res.status(406).send({ message: messages.MISSING_COLOR, detail: null });

    else if(req.body.picture == undefined) res.status(406).send({ message: messages.MISSING_PICTURE, detail: null });

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
                  connection.query(`INSERT INTO element (IMAGE, TYPE_ID, COLOR_ID, USER_ID) VALUES ("${req.body.picture}", ${req.body.type}, ${req.body.color}, ${account.USER_ID})`, (error, insertedId) =>
                  {
                    connection.release();
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      res.status(201).send({ message: messages.WARDROBE_ELEMENT_ADDED })
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
