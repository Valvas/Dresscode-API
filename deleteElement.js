'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.delete('/deleteElement', (req, res) =>
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
                  checkIfElementExists(req.body.uuid, account.USER_ID, connection, res);
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function checkIfElementExists(elementUuid, accountId, connection, res)
  {
    connection.query(`SELECT * FROM element WHERE UUID = "${elementUuid}"`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else if(result.length == 0)
      {
        connection.release();

        res.status(200).send({ message: messages.WARDROBE_ELEMENT_DELETED });
      }

      else
      {
        removeColorsOfElement(result[0].ELEMENT_ID, accountId, connection, res);
      }
    });
  }

  /****************************************************************************************************/

  function removeColorsOfElement(elementId, accountId, connection, res)
  {
    connection.query(`DELETE FROM element_x_color WHERE ELEMENT_ID = ${elementId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else if(result.affectedRows == 0)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: 'Colors could not be deleted for current element' });
      }

      else
      {
        removeElementFromOutfit(elementId, accountId, connection, res);
      }
    });
  }

  /****************************************************************************************************/

  function removeElementFromOutfit(elementId, accountId, connection, res)
  {
    connection.query(`DELETE FROM outfit_x_element WHERE ELEMENT_ID = ${elementId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        removeElementFromDatabase(elementId, accountId, connection, res);
      }
    });
  }

  /****************************************************************************************************/

  function removeElementFromDatabase(elementId, accountId, connection, res)
  {
    connection.query(`DELETE FROM element WHERE ELEMENT_ID = ${elementId}`, (error, result) =>
    {
      connection.release();

      if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

      else
      {
        res.status(200).send({ message: messages.WARDROBE_ELEMENT_DELETED });
      }
    });
  }

  /****************************************************************************************************/
};
