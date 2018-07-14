'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/searchOutfit', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.name == undefined && req.body.elements == undefined) res.status(406).send({ message: messages.MISSING_PARAMETERS, detail: null });

    //else if(req.body.elements) res.status(406).send({ message: messages.MISSING_ELEMENTS, detail: null });

    //else if(req.body.elements.length < 2) res.status(406).send({ message: messages.AMOUNT_OF_ELEMENTS_RECQUIRED, detail: null });

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
                  var colorsStr = "";
                  var arrayOfColors = [];
                  var arrayOfTypes = [];
                  loopThroughEachELementOfOutfit(req.body.name, req.body.elements, 0, connection, res, account.USER_ID, colorsStr, arrayOfColors, arrayOfTypes);
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function loopThroughEachELementOfOutfit(outfitName, elements, elementIndex, connection, res, userId, colorsStr, arrayOfColors, arrayOfTypes)
  {
    if(elements != undefined && elementIndex < elements.length)
    {
      putColorsOfElementInString(outfitName, elements, elementIndex, elements[elementIndex].color, elements[elementIndex].type, 0, colorsStr, connection, res, userId, arrayOfColors, arrayOfTypes);
    }
    else
    {
      findOutfit(outfitName, arrayOfTypes, arrayOfColors, userId, connection, res);
    }
  }

  /****************************************************************************************************/

  function putColorsOfElementInString(outfitName, elements, elementIndex, colors, type, colorsIndex, colorsStr, connection, res, userId, arrayOfColors, arrayOfTypes)
  {
    if(colorsIndex < colors.length)
    {
      colorsStr += "exc.COLOR_ID = " + colors[colorsIndex] + " or ";

      putColorsOfElementInString(outfitName, elements, elementIndex, colors, type, (colorsIndex+1), colorsStr, connection, res, userId, arrayOfColors, arrayOfTypes);
    }
    else
    {
      var typesStr = "";
      if(colorsStr.length > 0)
      {
        colorsStr = colorsStr.substr(0, colorsStr.length - 4);
      }
      putTypeOfElementInString(outfitName, elements, elementIndex, colorsStr, type, typesStr, connection, res, userId, arrayOfColors, arrayOfTypes);
    }
  }

  /****************************************************************************************************/

  function putTypeOfElementInString(outfitName, elements, elementIndex, colorsStr, type, typesStr, connection, res, userId, arrayOfColors, arrayOfTypes)
  {
    typesStr += "e.TYPE_ID = " + type;

    arrayOfTypes.push(typesStr);
    arrayOfColors.push(colorsStr);

    colorsStr = "";
    typesStr = "";

    loopThroughEachELementOfOutfit(outfitName, elements, (elementIndex+1), connection, res, userId, colorsStr, arrayOfColors, arrayOfTypes)
  }

  /****************************************************************************************************/

  function findOutfit(outfitName, arrayOfTypes, arrayOfColors, userId, connection, res)
  {
    var where = "";
    buildWhereClause(outfitName, arrayOfTypes, arrayOfColors, 0, userId, connection, res, where);
  }

  /****************************************************************************************************/

  function buildWhereClause(outfitName, arrayOfTypes, arrayOfColors, index, userId, connection, res, where)
  {
    if(index < arrayOfTypes.length)
    {
      buildWhereClause(outfitName, arrayOfTypes, arrayOfColors, (index+1), userId, connection, res, where + "(" + arrayOfTypes[index] + " AND (" + arrayOfColors[index] + ")) OR ")
    }
    else
    {
      queryDatabase(outfitName, arrayOfTypes, arrayOfColors, index, userId, connection, res, where.substr(0, where.length - 4));
    }
  }

  /****************************************************************************************************/

  function queryDatabase(outfitName, arrayOfTypes, arrayOfColors, index, userId, connection, res, where)
  {
    connection.query(`SELECT o.OUTFIT_ID, o.NAME, o.UUID as outfitUUID, e.ELEMENT_ID, e.IMAGE, e.UUID as elementUUID, e.TYPE_ID, exc.COLOR_ID
                      FROM outfit o
                      	inner join outfit_x_element oxe on o.OUTFIT_ID = oxe.OUTFIT_ID
                        inner join element e on e.ELEMENT_ID = oxe.ELEMENT_ID
                        inner join element_x_color exc on exc.ELEMENT_ID = e.ELEMENT_ID
                      WHERE o.NAME LIKE '%${outfitName}%' AND ` + where + ` AND o.USER_ID = ` + userId, (error, result) =>
    {
      var outfits = [];
      var elements = [];
      var colors = [];
      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }
      else if(result[0] == undefined)
      {
        connection.release();

        res.status(200).send({ outfits: outfits });
      }
      else
      {
        var tempElements = [];
        var tempOutfits = [];

        buildOutfitsObject(result, 0, connection, outfits, elements, colors, res, tempElements, tempOutfits);
      }
    });
  }

  /****************************************************************************************************/

  function buildOutfitsObject(result, outfitIndex, connection, outfits, elements, colors, res, tempElements, tempOutfits)
  {
    if(outfitIndex < result.length)
    {

      if( outfitIndex > 0 &&  !(tempElements.some(e => e.uuid === result[outfitIndex].elementUUID)) )
      {
        elements.push(tempElements[tempElements.length-1]);

        colors = [];
      }

      if( outfitIndex > 0 && !(tempOutfits.some(e => e.uuid === result[outfitIndex].outfitUUID)) )
      {
        outfits.push(tempOutfits[tempOutfits.length-1]);

        colors = [];
      }

      colors.push(result[outfitIndex].COLOR_ID);

      tempElements.push({
        uuid: result[outfitIndex].elementUUID,
        picture: result[outfitIndex].IMAGE,
        type: result[outfitIndex].TYPE_ID,
        color: colors
      });

      tempOutfits.push({
        uuid: result[outfitIndex].outfitUUID,
        name: result[outfitIndex].NAME,
        elements: elements
      });

      buildOutfitsObject(result, (outfitIndex+1), connection, outfits, elements, colors, res, tempElements, tempOutfits)
    }
    else
    {
      elements.push(tempElements[tempElements.length-1]);
      outfits.push(tempOutfits[tempOutfits.length-1]);

      connection.release();
      res.status(200).send({ outfits: outfits });
    }
  }

  /****************************************************************************************************/

  function getColorsForEachElement(elementsResult, index, connection, outfits, elements, res)
  {
    if(index < result.length)
    {
      connection.query(`SELECT COLOR_ID FROM element_x_color WHERE ELEMENT_ID = ${elementsResult[index].ELEMENT_ID}`, (error, resultColor) =>
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

          if ( !(elements.some(e => e.uuid === result[index].UUID)) ) {
            elements.push({
              uuid: elementsResult[index].UUID,
              picture: elementsResult[index].IMAGE,
              type: elementsResult[index].TYPE_ID,
              color: colors
            });
          }

          getColorsForEachElement(result, (index+1), connection, elements, res);
        }
      });
    }
    else
    {
      connection.release();
      res.status(200).send({ elements: elements });
    }
  }

  /****************************************************************************************************/
};
