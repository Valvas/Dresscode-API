'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/addOutfit', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.name == undefined) res.status(406).send({ message: messages.MISSING_OUTFIT_NAME, detail: null });

    else if(req.body.elements == undefined) res.status(406).send({ message: messages.MISSING_ELEMENTS, detail: null });

    else if(req.body.elements.length < 2) res.status(406).send({ message: messages.AMOUNT_OF_ELEMENTS_RECQUIRED, detail: null });

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
                  connection.query(`SELECT * FROM outfit WHERE NAME = "${(req.body.name).toLowerCase()}" AND USER_ID = "${account.USER_ID}"`, (error, result) =>
                  {
                    if(result[0] != undefined)
                    {
                      connection.release();

                      res.status(406).send({ message: messages.NAME_ALREADY_USED, detail: null });
                    }
                    else
                    {
                      var elements = req.body.elements;

                      const uuid = UUIDModule();

                      connection.query(`INSERT INTO outfit (NAME, USER_ID, UUID) VALUES ("${(req.body.name).toLowerCase()}", ${account.USER_ID}, "${uuid}")`, (error, result) =>
                      {
                        if(error)
                        {
                          connection.release();

                          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                        }

                        else
                        {
                          addEachElementOfOutfit(elements, 0, result.insertId, connection, res, account);
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
    }
  });

  function addEachElementOfOutfit(elements, index, outfitId, connection, res, account)
  {
    if(index < elements.length)
    {
      createElementIfNotExists(elements, index, outfitId, connection, account, res);
    }

    else
    {
      connection.release();
      res.status(201).send({ message: messages.WARDROBE_OUTFIT_ADDED });
    }
  }

  function createElementIfNotExists(elements, index, outfitId, connection, account, res)
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
          createNewElementFromScratch(elements, index, outfitId, account, connection, res);
        }
        else
        {
          addOneElementOfOutfit(elements, index, outfitId, connection, res, account, result[0].ELEMENT_ID);
        }
      }
    });
  }

  function createNewElementFromScratch(elements, index, outfitId, account, connection, res)
  {
    const uuid = UUIDModule();

    connection.query(`INSERT INTO element (IMAGE, TYPE_ID, USER_ID, UUID) VALUES ("${elements[index].picture}", ${elements[index].type}, ${account.USER_ID}, "${uuid}")`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        insertColorsOfElement(elements, index, connection, result.insertId, elements[index].color, 0, res, outfitId, account);
      }
    });
  }

  function insertColorsOfElement(elements, elementIndex, connection, elementId, colors, index, res, outfitId, account)
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
          insertColorsOfElement(elements, elementIndex, connection, elementId, colors, (index+1), res, outfitId, account);
        }
      });
    }
    else
    {
      addOneElementOfOutfit(elements, elementIndex, outfitId, connection, res, account, elementId);
    }
  }

  function addOneElementOfOutfit(elements, index, outfitId, connection, res, account, elementId)
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
        addEachElementOfOutfit(elements, (index+1), outfitId, connection, res, account);
      }
    });
  }

};
