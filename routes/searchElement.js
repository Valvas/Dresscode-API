'use strict'

const UUIDModule  = require('uuid/v4');
const messages    = require('../messages');
const functions   = require('../functions');

module.exports = (app) =>
{
  app.post('/searchElement', (req, res) =>
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
                if(error != null)
                {
                  connection.release();

                  res.status(error.status).send({ message: error.message, detail: error.detail });
                }

                else
                {
                  var colorsStr = "";
                  putColorsOfElementInString(req.body.color, req.body.type, 0, colorsStr, connection, res, account.USER_ID)
                }
              });
            }
          });
        }
      });
    }
  });

  /****************************************************************************************************/

  function findElement(type, colors, userId, connection, res)
  {
    connection.query(`SELECT e.ELEMENT_ID, e.TYPE_ID, e.UUID, e.IMAGE, exc.COLOR_ID FROM element e inner join element_x_color exc on e.ELEMENT_ID = exc.ELEMENT_ID WHERE e.USER_ID = ${userId} and e.TYPE_ID in (${type}) and exc.COLOR_ID in (${colors})`, (error, result) =>
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
        getColorsForEachElement(result, 0, connection, elements, res);
      }
    });
  }

  /****************************************************************************************************/

  function putColorsOfElementInString(colors, types, colorsIndex, colorsStr, connection, res, userId)
  {
    if(colorsIndex < colors.length)
    {
      colorsStr += colors[colorsIndex] + ", ";

      putColorsOfElementInString(colors, types, (colorsIndex+1), colorsStr, connection, res, userId);
    }
    else
    {
      var typesStr = "";
      colorsStr = colorsStr.substr(0, colorsStr.length - 2);
      putTypesOfElementInString(colorsStr, types, 0, typesStr, connection, res, userId);
    }
  }

  /****************************************************************************************************/

  function putTypesOfElementInString(colorsStr, types, typesIndex, typesStr, connection, res, userId)
  {
    if(typesIndex < types.length)
    {
      typesStr += types[typesIndex] + ", ";

      putTypesOfElementInString(colorsStr, types, (typesIndex+1), typesStr, connection, res, userId);
    }
    else
    {
      typesStr = typesStr.substr(0, typesStr.length - 2);
      findElement(typesStr, colorsStr, userId, connection, res)
    }
  }

  /****************************************************************************************************/

  function getColorsForEachElement(result, index, connection, elements, res)
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
