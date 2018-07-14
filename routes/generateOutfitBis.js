'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/generateOutfitBis', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.type == undefined) res.status(406).send({ message: messages.MISSING_TYPE, detail: null });

    else if(req.body.color == undefined) res.status(406).send({ message: messages.MISSING_COLOR, detail: null });

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
                connection.release();

                if(error != null)
                {
                  res.status(error.status).send({ message: error.message, detail: error.detail });
                }

                else
                {
                  var indexColorArray = [];
                  var elements = [];
                  generateOutfit(req.body.type, 0, req.body.color, res, indexColorArray, elements)
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function generateOutfit(types, typeIndex, colors, res, indexColorArray, elements)
  {
    if(typeIndex < types.length)
    {
      var numberOfColorsOfType = getRandomInt(colors.length);
      attributeColorsOfCurrentType(numberOfColorsOfType, 0, types, typeIndex, colors, res, indexColorArray, elements);
    }
    else
    {
      res.status(200).send({ elements: elements });
    }
  }

  /****************************************************************************************************/

  function attributeColorsOfCurrentType(numberOfColorsOfType, colorsIndex, types, typeIndex, colors, res, indexColorArray, elements)
  {
    if(colorsIndex < numberOfColorsOfType)
    {
      var colorId = getRandomInt(colors.length);
      if(indexColorArray.includes(colorId))
      {
        attributeColorsOfCurrentType(numberOfColorsOfType, colorsIndex, types, typeIndex, colors, res, indexColorArray, elements);
      }
      else
      {
        indexColorArray.push(colorId);
      }

      attributeColorsOfCurrentType(numberOfColorsOfType, (colorsIndex+1), types, typeIndex, colors, res, indexColorArray, elements);
    }
    else
    {
      elements.push({
        type: types[typeIndex],
        color: indexColorArray
      });
      indexColorArray = [];
      generateOutfit(types, (typeIndex+1), colors, res, indexColorArray, elements);
    }
  }

  /****************************************************************************************************/

  function getRandomInt(max) {
    return Math.ceil(Math.random() * Math.floor(max));
  }

};
