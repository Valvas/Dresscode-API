'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/updateElement', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.type == undefined) res.status(406).send({ message: messages.MISSING_TYPE, detail: null });

    else if(req.body.color == undefined) res.status(406).send({ message: messages.MISSING_COLOR, detail: null });

    else if(req.body.picture == undefined) res.status(406).send({ message: messages.MISSING_PICTURE, detail: null });

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
                  checkIfElementExists(req.body.type, req.body.picture, req.body.color, req.body.uuid, account.USER_ID, connection, res)
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function checkIfElementExists(type, picture, colors, elementUuid, accountId, connection, res)
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
        createNewElementFromProvidedUuid(picture, type, colors, accountId, elementUuid, connection, res)
      }

      else
      {
        updateElementFromProvidedUuid(picture, type, colors, accountId, elementUuid, connection, res, result[0].ELEMENT_ID);
      }
    });
  }

  /****************************************************************************************************/

  function updateElementFromProvidedUuid(picture, type, colors, accountId, elementUuid, connection, res, elementId)
  {
    functions.checkUuidFormat(elementUuid, (error) =>
    {
      if(error != null)
      {
        connection.release();

        res.status(error.status).send({ message: error.message, detail: error.detail });
      }
      else
      {
        connection.query(`UPDATE element set IMAGE = "${picture}", TYPE_ID = ${type} WHERE UUID = "${elementUuid}" and USER_ID = ${accountId}`, (error) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }
          else
          {
            connection.query(`DELETE FROM element_x_color WHERE ELEMENT_ID = ${elementId}`, (error, result) =>
            {
              if(error)
              {
                connection.release();

                res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
              }
              else
              {
                insertColorsOfElement(connection, elementId, colors, 0, res);
              }
            });
          }
        });
      }
    });
  }

  /****************************************************************************************************/

  function insertColorsOfElement(connection, elementId, colors, index, res)
  {
    if(index < colors.length)
    {
      connection.query(`INSERT INTO element_x_color (ELEMENT_ID, COLOR_ID) VALUES (${elementId}, ${colors[index]})`, (error) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
          insertColorsOfElement(connection, elementId, colors, (index+1), res);
        }
      });
    }
    else
    {
        connection.release();
        res.status(201).send({ message: messages.WARDROBE_ELEMENT_UPDATED });
    }
  }

  /****************************************************************************************************/

  // UUID PROVIDED IN THE REQUEST. CREATE A NEW ELEMENT IF NO EXISTS USING THE UUID PROVIDED.

  function createNewElementFromProvidedUuid(picture, type, colors, accountId, providedUuid, connection, res)
  {
    functions.checkUuidFormat(providedUuid, (error) =>
    {
      if(error != null)
      {
        connection.release();

        res.status(error.status).send({ message: error.message, detail: error.detail });
      }

      else
      {
        connection.query(`INSERT INTO element (IMAGE, TYPE_ID, USER_ID, UUID) VALUES ("${picture}", ${type}, ${accountId}, "${providedUuid}")`, (error, result) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }

          else
          {
            insertColorsOfElement(connection, result.insertId, colors, 0, res);
          }
        });
      }
    });
  }

  /****************************************************************************************************/
};
