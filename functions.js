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
