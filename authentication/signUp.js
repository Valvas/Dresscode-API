'use strict';

const bcrypt        = require('bcrypt');
const params        = require('../params');
const messages      = require('../messages');
const jwt           = require('jsonwebtoken');

module.exports = (app) => 
{
    var account = {};

    app.post('/signUp', (req, res) =>
    {
        if(req.body.email == undefined) res.status(406).send({ message: messages.MISSING_EMAIL_ADDRESS, detail: null });

        else if(req.body.password == undefined) res.status(406).send({ message: messages.MISSING_PASSWORD, detail: null });

        else if(req.body.lastname == undefined) res.status(406).send({ message: messages.MISSING_LASTNAME, detail: null });

        else if(req.body.firstname == undefined) res.status(406).send({ message: messages.MISSING_FIRSTNAME, detail: null });

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
            res.status(406).send({ message: messages.INCORRECT_EMAIL_ADDRESS_FORMAT, detail: null });
        }

        else
        {
            checkIfEmailIsAvailable(account, req, res);
        }
    }

    function checkIfEmailIsAvailable(account, req, res)
    {
        req.app.get('pool').getConnection((error, connection) =>
        {
            if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

            else
            {
                connection.query(`SELECT * FROM users WHERE MAIL = "${account.email}"`, (error, result) =>
                {
                    connection.release();

                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else if(result.length > 0)
                    {
                        res.status(406).send({ message: messages.EMAIL_ADDRESS_NOT_AVAILABLE, detail: null });
                    }

                    else
                    {
                        encryptPassword(account, req, res);
                    }
                });
            }
        });
    }

    function encryptPassword(account, req, res)
    {
        bcrypt.hash(account.password, params.salt, (error, encryptedPassword) =>
        {
            if(error) res.status(500).send({ message: messages.ENCRYPTION_ERROR, detail: error.message });

            else
            {
                account.password = encryptedPassword;

                saveAccountInDatabase(account, req, res);
            }
        });
    }

    function saveAccountInDatabase(account, req, res)
    {
        req.app.get('pool').getConnection((error, connection) =>
        {
            if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

            else
            {
                connection.query(`INSERT INTO users (MAIL, PASSWORD, FIRSTNAME, LASTNAME) values ("${account.email}", "${account.password}", "${account.firstname.toLowerCase()}", "${account.lastname.toLowerCase()}")`, (error, insertedID) =>
                {
                    connection.release();
                    
                    if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message });

                    else
                    {
                        createToken(account, req, res);
                    }
                });
            }
        });
    }

    function createToken(account, req, res)
    {
        jwt.sign({ email: account.email }, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
        {
            if(error) res.status(500).send({ message: messages.TOKEN_CREATION_ERROR, detail: error.message });

            else
            {
                res.status(201).send({ token: token });
            }
        });
    }
};
