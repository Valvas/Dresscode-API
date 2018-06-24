'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.get('/getAllElements', (req, res) =>
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
                  connection.query(`SELECT * FROM element WHERE USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      if(result[0] == undefined)
                      {
                        res.status(406).send({ message: messages.NO_ELEMENT_FOUND + account.USER_ID });
                      }
                      else
                      {
                        var elements = [];
                        for (var i = 0; i < result.length; i++) {
                          elements.push({
                            id: result[i].ELEMENT_ID,
                            image: result[i].IMAGE,
                            type_id: result[i].TYPE_ID,
                            color_id: result[i].COLOR_ID,
                            user_id: result[i].USER_ID
                          });
                        }
                        res.status(200).send({ elements: elements });
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
};
