'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/updateOutfit', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.name == undefined) res.status(406).send({ message: messages.MISSING_OUTFIT_NAME, detail: null });

    else if(req.body.elements == undefined) res.status(406).send({ message: messages.MISSING_ELEMENTS, detail: null });

    else if(req.body.elements.length < 2) res.status(406).send({ message: messages.AMOUNT_OF_ELEMENTS_RECQUIRED, detail: null });

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
                  checkIfOutfitExists(req.body.name, req.body.elements, req.body.uuid, account.USER_ID, connection, res)
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function checkIfOutfitExists(outfitName, elements, outfitUuid, accountId, connection, res)
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
        createNewOutfitFromProvidedUuid(outfitName, elements, outfitUuid, accountId, connection, res);
      }

      else
      {
        var outfitId = result[0].OUTFIT_ID;
        connection.query(`UPDATE outfit SET NAME = "${outfitName.toLowerCase()}" WHERE UUID = "${outfitUuid}"`, (error, result) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }
          else
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
                addEachElementOfOutfit(elements, 0, outfitId, connection, res, accountId);
              }
            });
          }
        });
      }
    });
  }

  /****************************************************************************************************/

  function createNewOutfitFromProvidedUuid(outfitName, elements, outfitUuid, accountId, connection, res)
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
        connection.query(`INSERT INTO outfit (NAME, UUID, USER_ID) VALUES ("${outfitName}", "${outfitUuid}", ${accountId})`, (error, result) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }

          else
          {
            addEachElementOfOutfit(elements, 0, result.insertId, connection, res, accountId);
          }
        });
      }
    });
  }

  /****************************************************************************************************/

  function addEachElementOfOutfit(elements, index, outfitId, connection, res, accountId)
  {
    if(index < elements.length)
    {
      createElementIfNotExists(elements, index, outfitId, connection, accountId, res);
    }

    else
    {
      connection.release();
      res.status(201).send({ message: messages.WARDROBE_OUTFIT_UPDATED });
    }
  }

  /****************************************************************************************************/

  function createElementIfNotExists(elements, index, outfitId, connection, accountId, res)
  {
    connection.query(`SELECT * FROM element WHERE UUID = "${elements[index].uuid}"`, (error, result) =>
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
          createNewElementFromScratch(elements, index, outfitId, accountId, connection, res);
        }
        else
        {
          addOneElementOfOutfit(elements, index, outfitId, connection, res, accountId, result[0].ELEMENT_ID);
        }
      }
    });
  }

  /****************************************************************************************************/

  function createNewElementFromScratch(elements, index, outfitId, accountId, connection, res)
  {
    const uuid = UUIDModule();

    connection.query(`INSERT INTO element (IMAGE, TYPE_ID, USER_ID, UUID) VALUES ("${elements[index].picture}", ${elements[index].type}, ${accountId}, "${uuid}")`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        insertColorsOfElement(elements, index, connection, result.insertId, elements[index].color, 0, res, outfitId, accountId);
      }
    });
  }

  /****************************************************************************************************/

  function insertColorsOfElement(elements, elementIndex, connection, elementId, colors, index, res, outfitId, accountId)
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
          insertColorsOfElement(elements, elementIndex, connection, elementId, colors, (index+1), res, outfitId, accountId);
        }
      });
    }
    else
    {
      addOneElementOfOutfit(elements, elementIndex, outfitId, connection, res, accountId, elementId);
    }
  }

  /****************************************************************************************************/

  function addOneElementOfOutfit(elements, index, outfitId, connection, res, accountId, elementId)
  {
    connection.query(`INSERT INTO outfit_x_element (OUTFIT_ID, ELEMENT_ID) VALUES ("${outfitId}", ${elementId})`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        addEachElementOfOutfit(elements, (index+1), outfitId, connection, res, accountId);
      }
    });
  }

};
