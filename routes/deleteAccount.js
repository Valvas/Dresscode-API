'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.get('/deleteAccount', (req, res) =>
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
                if(error != null)
                {
                  connection.release();

                  res.status(error.status).send({ message: error.message, detail: error.detail });
                }

                else
                {
                  connection.query(`SELECT OUTFIT_ID FROM outfit WHERE USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    if(error)
                    {
                      connection.release();

                      res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                    }
                    else
                    {
                      deleteElementsFromOutfits(result, 0, account.USER_ID, connection, res);
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

  /****************************************************************************************************/

  function deleteElementsFromOutfits(result, index, accountId, connection, res)
  {
    if(index < result.length)
    {
      connection.query(`DELETE FROM outfit_x_element WHERE OUTFIT_ID = ${result[index].OUTFIT_ID}`, (error, result) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }
        else
        {
          deleteElementsFromOutfits(result, (index+1), accountId, connection, res)
        }
      });
    }
    else
    {
      deleteOutfits(accountId, connection, res);
    }
  }

  /****************************************************************************************************/

  function deleteOutfits(accountId, connection, res)
  {
    connection.query(`DELETE FROM outfit WHERE USER_ID = ${accountId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }
      else
      {
        connection.query(`SELECT ELEMENT_ID FROM element WHERE USER_ID = ${accountId}`, (error, result) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }
          else
          {
            deleteColorsFromElements(result, 0, accountId, connection, res);
          }
        });
      }
    });
  }

  /****************************************************************************************************/

  function deleteColorsFromElements(result, index, accountId, connection, res)
  {
    if(index < result.length)
    {
      connection.query(`DELETE FROM element_x_color WHERE ELEMENT_ID = ${result[index].ELEMENT_ID}`, (error, result) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }
        else
        {
          deleteColorsFromElements(result, (index+1), accountId, connection, res)
        }
      });
    }
    else
    {
      deleteElements(accountId, connection, res);
    }
  }

  /****************************************************************************************************/

  function deleteElements(accountId, connection, res)
  {
    connection.query(`DELETE FROM element WHERE USER_ID = ${accountId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }
      else
      {
        connection.query(`DELETE FROM users WHERE USER_ID = ${accountId}`, (error, result) =>
        {
          if(error)
          {
            connection.release();

            res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
          }
          else
          {
            res.status(200).send({ message: messages.ACCOUNT_DELETED });
          }
        });
      }
    });
  }

};
