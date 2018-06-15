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