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
                    if(error)
                    {
                      connection.release();

                      res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                    }

                    else
                    {
                      var elements = [];
                      if(result[0] == undefined)
                      {
                        connection.release();

                        res.status(200).send({ elements: elements });
                      }
                      else
                      {
                        getColorsForEachElement(result, 0, connection, elements, res);
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
  function getColorsForEachElement(result, index, connection, elements, res)
  {
    if(index < result.length)
    {
      connection.query(`SELECT COLOR_ID FROM element_x_color WHERE ELEMENT_ID = ${result[index].ELEMENT_ID}`, (error, resultColor) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
          var colors = [];
          for(var j = 0; j < resultColor.length; j++) {
            colors.push(resultColor[j].COLOR_ID);
          }

          elements.push({
            uuid: result[index].UUID,
            picture: result[index].IMAGE,
            type: result[index].TYPE_ID,
            color: colors
          });
          getColorsForEachElement(result, (index+1), connection, elements, res);
        }
      });
    }
    else
    {
      connection.release();
      res.status(200).send({ elements: elements });
    }
  }
};
