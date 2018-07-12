'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/getElementDetails', (req, res) =>
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
                  connection.query(`SELECT * FROM element WHERE ELEMENT_ID = ${req.body.elementId}`, (error, result) =>
                  {
                    if(error)
                    {
                      connection.release();

                      res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                    }

                    else
                    {
                      if(result[0] == undefined)
                      {
                        connection.release();

                        res.status(406).send({ message: messages.NO_ELEMENT_FOUND });
                      }
                      else
                      {
                        var element = {
                          uuid: result[0].UUID,
                          picture: result[0].IMAGE,
                          type: result[0].TYPE_ID
                        };

                        connection.query(`SELECT COLOR_ID FROM element_x_color WHERE ELEMENT_ID = ${req.body.elementId}`, (error, resultColor) =>
                        {
                          if(error)
                          {
                            connection.release();

                            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                          }

                          else
                          {
                            var colors = [];
                            for (var i = 0; i < resultColor.length; i++) {
                              colors.push(resultColor[i].COLOR_ID);
                            }

                            element.color = colors;

                            connection.release();

                            res.status(200).send({ element: element });
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
    }
  });
};