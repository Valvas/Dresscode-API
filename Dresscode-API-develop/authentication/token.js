'use strict'

const messages  = require('../messages');
const functions = require('../functions');

module.exports = (app) =>
{
    app.put('/getNewToken', (req, res) =>
    {
        if(req.body.token == undefined) res.status(406).send({ message: messages.MISSING_TOKEN });

        else
        {
            functions.obtainNewToken(req.body.token, (error, newToken) =>
            {
                if(error != null) res.status(error.status).send({ message: error.message, detail: error.detail });

                else
                {
                    res.status(200).send({ token: newToken });
                }
            });
        }
    });
}