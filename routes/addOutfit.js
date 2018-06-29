'use strict'

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
                if(error != null) res.status(error.status).send({ message: error.message, detail: error.detail });

                else
                {

                  var elements = req.body.elements;

                  connection.query(`INSERT INTO outfit (NAME, USER_ID) VALUES ("${req.body.name}", ${account.USER_ID})`, (error, result) =>
                  {
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                      addEachElementOfOutfit(elements, 0, result.insertId, connection, res);

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

  function addEachElementOfOutfit(elements, index, insertedId, connection, res) {
    if(index < elements.length)
    {
      connection.query(`INSERT INTO outfit_x_element (OUTFIT_ID, ELEMENT_ID) VALUES ("${insertedId}", ${elements[index]})`, (error, result) =>
      {
        if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

        else
        {
          addEachElementOfOutfit(elements, (index+1), insertedId, connection, res);
        }
      });
    }
    else
    {
      connection.release();
      res.status(201).send({ message: messages.WARDROBE_OUTFIT_ADDED });
    }
  }
};
