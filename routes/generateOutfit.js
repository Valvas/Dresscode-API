'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/generateOutfit', (req, res) =>
  {
    if(req.headers.authorization == undefined) res.status(406).send({ message: messages.MISSING_TOKEN, detail: null });

    else if(req.body.type == undefined) res.status(406).send({ message: messages.MISSING_TYPE, detail: null });

    else if(req.body.type.length < 2) res.status(406).send({ message: messages.AMOUNT_OF_TYPES_RECQUIRED, detail: null });

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
                if(error != null)
                {
                  connection.release();

                  res.status(error.status).send({ message: error.message, detail: error.detail });
                }

                else
                {
                  var colorsStr = "";
                  putColorsOfElementInString(req.body.color, req.body.type, 0, colorsStr, connection, res, account.USER_ID);
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function putColorsOfElementInString(colors, types, colorsIndex, colorsStr, connection, res, userId)
  {
    if(colors != undefined && colorsIndex < colors.length)
    {
      colorsStr += colors[colorsIndex] + ", ";

      putColorsOfElementInString(colors, types, (colorsIndex+1), colorsStr, connection, res, userId);
    }
    else
    {
      var typesStr = "";
      if(colorsStr.length > 0)
      {
        colorsStr = colorsStr.substr(0, colorsStr.length - 2);
      }

      var where = "";
      buildWhereClause(colorsStr, types, 0, connection, res, userId, where);
    }
  }

  /****************************************************************************************************/

  function buildWhereClause(colorsStr, types, index, connection, res, userId, where)
  {
    if(index < types.length)
    {
      buildWhereClause(colorsStr, types, (index+1), connection, res, userId, where + "(TYPE_ID = " + types[index] + " AND exc.COLOR_ID IN (" + colorsStr + ")) OR ");
    }
    else
    {
      queryDatabase(userId, connection, res, where.substr(0, where.length - 4), types);
    }
  }

  /****************************************************************************************************/

  function queryDatabase(userId, connection, res, where, types)
  {
    connection.query(`SELECT * FROM element e
                    	inner join element_x_color exc on exc.ELEMENT_ID = e.ELEMENT_ID
                    WHERE ` + where + ` AND e.USER_ID = ` + userId, (error, result) =>
    {
      var elements = [];

      if(error)
      {
        connection.release();

        res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });
      }
      else if(result[0] == undefined)
      {
        connection.release();

        res.status(200).send({ elements: elements });
      }
      else
      {
        getColorsForEachElement(result, 0, connection, elements, res, types);
      }
    });
  }

  /****************************************************************************************************/

  function getColorsForEachElement(result, index, connection, elements, res, types)
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

          if ( !(elements.some(e => e.uuid === result[index].UUID)) ) {
            elements.push({
              uuid: result[index].UUID,
              picture: result[index].IMAGE,
              type: result[index].TYPE_ID,
              color: colors
            });
          }

          getColorsForEachElement(result, (index+1), connection, elements, res, types);
        }
      });
    }
    else
    {
      connection.release();

      var generatedElements = [];
      var elementsUsed = [];

      generateOutfit(elements, 0, res, types, generatedElements, elementsUsed);
    }
  }

  /****************************************************************************************************/

  function generateOutfit(elements, index, res, types, generatedElements, elementsUsed)
  {
    if(index < (types.length))
    {
      var elementIndex = getRandomInt(elements.length);

      if( elementsUsed.includes(elementIndex) && generatedElements.some(e => e.type === elements[elementIndex].type) )
      {
        generateOutfit(elements, index, res, types, generatedElements, elementsUsed);
      }
      else
      {
        generatedElements.push(elements[elementIndex]);

        elementsUsed.push(elementIndex);

        generateOutfit(elements, (index+1), res, types, generatedElements, elementsUsed);
      }
    }
    else
    {
      res.status(200).send({ elements: generatedElements });
    }
  }

  /****************************************************************************************************/

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

};
