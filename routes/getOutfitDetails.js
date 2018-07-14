'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/getOutfitDetails', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.uuid == undefined) res.status(406).send({ message: messages.MISSING_UUID, detail: null });

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
                  connection.query(`SELECT o.NAME, e.UUID FROM outfit o
                                      inner join outfit_x_element oxe on oxe.OUTFIT_ID = o.OUTFIT_ID
                                      inner join element e on e.ELEMENT_ID = oxe.ELEMENT_ID
                                    WHERE o.UUID = "${req.body.uuid}"`, (error, result) =>
                  {
                    if(error)
                    {
                      connection.release();

                      res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                    }

                    else
                    {
                      connection.release();

                      if(result[0] == undefined)
                      {
                        res.status(406).send({ message: messages.NO_OUTFIT_FOUND });
                      }
                      else
                      {
                        var elements = [];
                        buildOutfitObject(result, 0, elements, res);
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

  function buildOutfitObject(result, index, elements, res)
  {
    if(index < result.length)
    {
      elements.push(result[index].UUID);

      buildOutfitObject(result, (index+1), elements, res);
    }
    else
    {
      var outfit = {
        name: result[0].NAME,
        elements: elements
      }

      res.status(200).send({ outfit: outfit });
    }
  }

};
