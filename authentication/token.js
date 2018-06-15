'use strict'

const functions = require('../functions');

module.exports = (app) =>
{
    app.put('/getNewToken', (req, res) =>
    {
        if(req.body.token == undefined) res.status(406).send({ message: 'No token provided' });

        else
        {
            functions.obtainNewToken(req.body.token, (error, newToken) =>
            {
                if(error != null) res.status(error.status).send({ message: error.message });

                else
                {
                    res.status(200).send({ token: newToken });
                }
            });
        }
    });
}