'use strict'

const params    = require('./params');
const messages  = require('./messages');
const jwt       = require('jsonwebtoken');

/****************************************************************************************************/

module.exports.obtainNewToken = (token, callback) =>
{
    jwt.verify(token, params.secretKey, (error, decoded) =>
    {
        if(error && error.name !== 'TokenExpiredError') return callback({ status: 406, message: messages.TOKEN_READING_ERROR, detail: error.message });

        jwt.sign({ email: decoded.email }, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
        {
            if(error) return callback({ status: 500, message: messages.TOKEN_CREATION_ERROR, detail: error.message });

            return callback(null, token);
        });
    });
}

/****************************************************************************************************/

module.exports.getEmailFromToken = (token, callback) =>
{
    jwt.verify(token, params.secretKey, (error, decoded) =>
    {
        if(error) return callback({ status: 406, message: messages.TOKEN_READING_ERROR, detail: error.message });

        else
        {
            return callback(null, decoded.email);
        }
    });
}

/****************************************************************************************************/

module.exports.getAccountFromEmail = (emailAddress, connection, callback) =>
{
  connection.query(`SELECT * FROM users WHERE MAIL = "${emailAddress}"`, (error, result) =>
  {
    if(error) return callback({ status: 500, message: messages.DATABASE_ERROR, detail: error.message });

    if(result.length == 0) return callback({ status: 406, message: messages.ACCOUNT_DOES_NOT_EXIST, detail: null });

    return callback(null, result[0]);
  });
}

/****************************************************************************************************/

module.exports.checkUuidFormat = (uuidToCheck, callback) =>
{
  return new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").test(uuidToCheck)
  ? callback(null)
  : callback({ status: 406, message: messages.INCORRECT_UUID_FORMAT, detail: null });
}

/****************************************************************************************************/

module.exports.insertColorsInDatabase = (colorsObject, connection, callback) =>
{
  var currentIndex = 1;

  var browseColors = () =>
  {
    connection.query(`SELECT * FROM color WHERE COLOR_ID = ${currentIndex}`, (error, result) =>
    {
      if(error) return callback({ message: messages.DATABASE_ERROR, detail: error.message });

      else if(result.length > 0)
      {
        colorsObject[currentIndex += 1] != undefined
        ? browseColors()
        : callback(null);
      }

      else
      {
        connection.query(`INSERT INTO color (COLOR_ID, NAME) VALUES (${currentIndex}, "${colorsObject[currentIndex]}")`, (error, result) =>
        {
          if(error) return callback({ message: messages.DATABASE_ERROR, detail: error.message });

          else
          {
            colorsObject[currentIndex += 1] != undefined
            ? browseColors()
            : callback(null);
          }
        });
      }
    });
  }

  colorsObject[currentIndex] != undefined
  ? browseColors()
  : callback(null);
}

/****************************************************************************************************/

module.exports.insertTypesInDatabase = (typesObject, connection, callback) =>
{
  var currentIndex = 1;

  var browseTypes = () =>
  {
    connection.query(`SELECT * FROM type WHERE TYPE_ID = ${currentIndex}`, (error, result) =>
    {
      if(error) return callback({ message: messages.DATABASE_ERROR, detail: error.message });

      else if(result.length > 0)
      {
        typesObject[currentIndex += 1] != undefined
        ? browseTypes()
        : callback(null);
      }

      else
      {
        connection.query(`INSERT INTO type (TYPE_ID, NAME) VALUES (${currentIndex}, "${typesObject[currentIndex]}")`, (error, result) =>
        {
          if(error) return callback({ message: messages.DATABASE_ERROR, detail: error.message });

          else
          {
            typesObject[currentIndex += 1] != undefined
            ? browseTypes()
            : callback(null);
          }
        });
      }
    });
  }

  typesObject[currentIndex] != undefined
  ? browseTypes()
  : callback(null);
}

/****************************************************************************************************/
