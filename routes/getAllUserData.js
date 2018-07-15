'use strict'

const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.get('/getAllUserData', (req, res) =>
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
                        getColorsForEachElement(result, 0, connection, elements, res, account.USER_ID);
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

  /****************************************************************************************************/

  function getColorsForEachElement(result, index, connection, elements, res, userId)
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
          getColorsForEachElement(result, (index+1), connection, elements, res, userId);
        }
      });
    }
    else
    {
      getUserOutfits(elements, userId, connection, res);
    }
  }

  /****************************************************************************************************/

  function getUserOutfits(elements, userId, connection, res)
  {
    connection.query(`SELECT * FROM outfit WHERE USER_ID = ${userId}`, (error, result) =>
    {
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }

      else
      {
        var outfits = [];
        var elementsOfOutfit = [];
        if(result[0] == undefined)
        {
          connection.release();

          res.status(200).send({ outfits: outfits,
                                 elements: elements
                              });
        }
        else
        {
          getElementsForEachOutfit(elements, result, 0, connection, outfits, res, elementsOfOutfit);
        }
      }
    });
  }

  /****************************************************************************************************/

  function getElementsForEachOutfit(elements, resultOutfit, outfitIndex, connection, outfits, res, elementsOfOutfit)
  {
    if(outfitIndex < resultOutfit.length)
    {
      connection.query(`SELECT ELEMENT_ID FROM outfit_x_element WHERE OUTFIT_ID = ${resultOutfit[outfitIndex].OUTFIT_ID}`, (error, resultELements) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
          getElementsUuid(resultELements, 0, elements, outfitIndex, connection, outfits, res, elementsOfOutfit, resultOutfit);
        }
      });
    }
    else
    {
      connection.release();
      res.status(200).send({ outfits: outfits,
                             elements: elements
                          });
    }
  }

  /****************************************************************************************************/

  function getElementsUuid(resultELements, elementIndex, elements, outfitIndex, connection, outfits, res, elementsOfOutfit, resultOutfit)
  {
    if(elementIndex < resultELements.length)
    {
      connection.query(`SELECT UUID FROM element WHERE ELEMENT_ID = ${resultELements[elementIndex].ELEMENT_ID}`, (error, result) =>
      {
        if(error)
        {
          connection.release();

          res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
        }

        else
        {
            elementsOfOutfit.push(result[0].UUID);

            getElementsUuid(resultELements, (elementIndex+1), elements, outfitIndex, connection, outfits, res, elementsOfOutfit, resultOutfit);
        }
      });
    }
    else
    {
      outfits.push({
        uuid: resultOutfit[outfitIndex].UUID,
        name: resultOutfit[outfitIndex].NAME,
        elements: elementsOfOutfit
      });

      elementsOfOutfit = [];

      getElementsForEachOutfit(elements, resultOutfit, (outfitIndex+1), connection, outfits, res, elementsOfOutfit);
    }
  }

}
