'use strict';

const bcrypt    = require('bcrypt');
const params    = require('../params');
const messages  = require('../messages');
const jwt       = require('jsonwebtoken');

module.exports = (app) => 
{
  app.post('/signIn', (req, res) => 
  {
    if(req.body.email == undefined) res.status(406).send({ message: messages.MISSING_EMAIL_ADDRESS, detail: null });

    else if(req.body.password == undefined) res.status(406).send({ message: messages.MISSING_PASSWORD, detail: null });

    else
    {
      bcrypt.hash(req.body.password , params.salt, (error, encryptedPassword) =>
      {
        if(error) res.status(500).send({ message: messages.ENCRYPTION_ERROR, detail: error.message });

        else
        {
          req.app.get('pool', (error, connection) =>
          {
            if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message});

            else
            {
              connection.query(`SELECT * FROM users WHERE MAIL = "${req.body.email}" AND PASSWORD = "${encryptedPassword}"`, (error, result) =>
              {
                connection.release();
                
                if(error) res.status(500).send({ message: messages.DATABASE_ERROR, detail: error.message});
    
                else
                {
                  result[0] == undefined ?
    
                  res.status(406).send({ message: messages.ACCOUNT_NOT_FOUND, detail: null }) :
    
                  jwt.sign({ email: result[0].MAIL }, params.secretKey, { expiresIn: (60 * 60 * 24) }, (error, token) =>
                  {
                    if(error) res.status(500).send({ message: messages.TOKEN_CREATION_ERROR, detail: error.message });
    
                    else
                    {
                      res.status(200).send({ token: token });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};
