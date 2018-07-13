'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.delete('/deleteOutfit', (req, res) =>
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
                if(error != null)
                {
                  connection.release();

                  res.status(error.status).send({ message: error.message, detail: error.detail });
                }

                else
                {
                  checkIfOutfitExists(req.body.uuid, account.USER_ID, connection, res);
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function checkIfOutfitExists(outfitUuid, accountId, connection, res)
  {
    connection.query(`SELECT * FROM outfit WHERE UUID = "${outfitUuid}"`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else if(result.length == 0)
      {
        connection.release();

        res.status(200).send({ message: messages.WARDROBE_OUTFIT_DELETED });
      }

      else
      {
        removeElementFromOutfit(outfitUuid, accountId, connection, res, result[0].OUTFIT_ID);
      }
    });
  }

  /****************************************************************************************************/

  function removeElementFromOutfit(outfitUuid, accountId, connection, res, outfitId)
  {
    connection.query(`DELETE FROM outfit_x_element WHERE OUTFIT_ID = ${outfitId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        removeOutfitFromDatabase(outfitUuid, accountId, connection, res);
      }
    });
  }

  /****************************************************************************************************/

  function removeOutfitFromDatabase(outfitUuid, accountId, connection, res)
  {
    connection.query(`DELETE FROM outfit WHERE UUID = "${outfitUuid}"`, (error, result) =>
    {
      connection.release();

      if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

      else
      {
        res.status(200).send({ message: messages.WARDROBE_OUTFIT_DELETED });
      }
    });
  }

  /****************************************************************************************************/
};
