'use strict'

const params    = require('./params');
const jwt       = require('jsonwebtoken');

/****************************************************************************************************/

module.exports.obtainNewToken = (token, callback) =>
{
    jwt.verify(token, params.secretKey, (error, decoded) =>
    {
        if(error && error.name !== 'TokenExpiredError') return callback({ status: 406, message: error.message });

        jwt.sign(decoded, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
        {
            if(error) return callback({ status: 500, message: error.message });

            return callback(null, token);
        });
    });
}

/****************************************************************************************************/