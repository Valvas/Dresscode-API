'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.get('/getAllOutfits', (req, res) =>
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
                  connection.query(`SELECT * FROM outfit WHERE USER_ID = ${account.USER_ID}`, (error, result) =>
                  {
                    if(error)
                    {
                      connection.release();

                      res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
                    }

                    else
                    {
                      var outfits = [];
                      if(result[0] == undefined)
                      {
                        connection.release();

                        res.status(200).send({ outfits: outfits });
                      }
                      else
                      {
                        getElementsForEachOutfit(result, 0, connection, outfits, res);
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

  function getElementsForEachOutfit(result, index, connection, outfits, res)
  {
    if(index < result.length)
    {
      connection.query(`SELECT ELEMENT_ID FROM outfit_x_element WHERE OUTFIT_ID = ${result[index].OUTFIT_ID}`, (error, resultELements) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
          var elementsDetails = [];
          var elementDetails = getElementDetails(resultELements, 0, connection, elementsDetails, result, index, outfits, res);
        }
      });
    }
    else
    {
      connection.release();
      res.status(200).send({ outfits: outfits });
    }
  }

  function getColorsForEachElement(elementsDetails, index, connection, elements, resultOutfit, indexOutfit, outfits, res)
  {
    if(index < elementsDetails.length)
    {
      connection.query(`SELECT COLOR_ID FROM element_x_color WHERE ELEMENT_ID = ${elementsDetails[index].id}`, (error, resultColor) =>
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
            uuid: elementsDetails[index].uuid,
            picture: elementsDetails[index].picture,
            type: elementsDetails[index].typeId,
            color: colors,
            //user_id: elementsDetails[index].userId
          });
          getColorsForEachElement(elementsDetails, (index+1), connection, elements, resultOutfit, indexOutfit, outfits, res);
        }
      });
    }
    else
    {
      outfits.push({
        uuid: resultOutfit[indexOutfit].UUID,
        name: resultOutfit[indexOutfit].NAME,
        //userId: resultOutfit[indexOutfit].USER_ID,
        elements : elements
      });

      getElementsForEachOutfit(resultOutfit, (indexOutfit+1), connection, outfits, res);
    }
  }

  function getElementDetails(elements, index, connection, elementsDetails, resultOutfit, indexOutfit, outfits, res)
  {
    if(index < elements.length)
    {
      connection.query(`SELECT * FROM element WHERE ELEMENT_ID = ${elements[index].ELEMENT_ID}`, (error, result) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
            elementsDetails.push({
              id: result[0].ELEMENT_ID,
              uuid: result[0].UUID,
              picture: result[0].IMAGE,
              typeId: result[0].TYPE_ID,
              userId: result[0].USER_ID
            });

            getElementDetails(elements, (index+1), connection, elementsDetails, resultOutfit, indexOutfit, outfits, res);
        }
      });
    }
    else
    {
      var elements = [];
      elements = getColorsForEachElement(elementsDetails, 0, connection, elements, resultOutfit, indexOutfit, outfits, res);
    }
  }

};
