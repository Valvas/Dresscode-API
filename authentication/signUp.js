'use strict';

const bcrypt        = require('bcrypt');
const params        = require('../params');
const jwt           = require('jsonwebtoken');

module.exports = (app) => 
{
    var account = {};

    app.post('/signUp', (req, res) =>
    {
        if(req.body.email      == undefined || req.body.password   == undefined || req.body.lastname   == undefined || req.body.firstname  == undefined)
        {
            res.status(406).send({ message: 'Missing data in the request' });
        }

        else
        {
            account.email       = req.body.email;
            account.password    = req.body.password;
            account.lastname    = req.body.lastname;
            account.firstname   = req.body.firstname;

            checkEmailFormat(account, req, res);
        }
    });

    function checkEmailFormat(account, req, res)
    {
        if(new RegExp("^[a-zA-Z][\\w\\.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\\w\\.-]*[a-zA-Z0-9]\\.[a-zA-Z][a-zA-Z\\.]*[a-zA-Z]$").test(account.email) == false)
        {
            res.status(406).send({ message: "Wrong email format" });
        }

        else
        {
            checkIfEmailIsAvailable(account, req, res);
        }
    }

    function checkIfEmailIsAvailable(account, req, res)
    {
        req.app.get('connection').query(`SELECT * FROM users WHERE MAIL = "${account.email}"`, (error, result) =>
        {
            if(error) res.status(500).send({ message: error.message });

            else if(result.length > 0)
            {
                res.status(406).send({ message: 'Email address not available' });
            }

            else
            {
                encryptPassword(account, req, res);
            }
        });
    }

    function encryptPassword(account, req, res)
    {
        bcrypt.hash(account.password, params.salt, (error, encryptedPassword) =>
        {
            if(error) res.status(500).send({ message: error.message });

            else
            {
                account.password = encryptedPassword;

                saveAccountInDatabase(account, req, res);
            }
        });
    }

    function saveAccountInDatabase(account, req, res)
    {
        req.app.get('connection').query(`INSERT INTO users (MAIL, PASSWORD, FIRSTNAME, LASTNAME) values ("${account.email}", "${account.password}", "${account.firstname.toLowerCase()}", "${account.lastname.toLowerCase()}")`, (error, insertedID) =>
        {
            if(error) res.status(500).send({ message: error.message });

            else
            {
                createToken(account, req, res);
            }
        });
    }

    function createToken(account, req, res)
    {
        jwt.sign(account.email, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
        {
            if(error) res.status(500).send({ message: error.message });

            else
            {
                res.status(201).send({ token: token });
            }
        });
    }
};
