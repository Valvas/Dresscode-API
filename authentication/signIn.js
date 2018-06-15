'use strict';

const bcrypt    = require('bcrypt');
const params    = require('../params');
const jwt       = require('jsonwebtoken');

module.exports = (app) => 
{
  app.post('/signIn', (req, res) => 
  {
    req.body.email      == undefined ||
    req.body.password   == undefined ?

    res.status(406).send({ message: 'Missing data in request' }) :

    bcrypt.hash(req.body.password , params.salt, (error, encryptedPassword) =>
    {
      if(error) res.status(500).send({ message: error.message });

      else
      {
        req.app.get('connection').query(`SELECT * FROM users WHERE MAIL = "${req.body.email}" AND PASSWORD = "${encryptedPassword}"`, (error, result) =>
        {
          if(error) res.status(500).send({ message: error.message });

          else
          {
            result[0] == undefined ?

            res.status(406).send({ message: 'Account not found in the database' }) :

            jwt.sign(result[0].MAIL, params.secretKey, { expiresIn: 60 * 60 * 24 }, (error, token) =>
            {
              if(error) res.status(500).send({ message: error.message });

              else
              {
                res.status(200).send(
                {
                  id: result[0].USER_ID,
                  email: result[0].MAIL,
                  password: result[0].PASSWORD,
                  lastname: result[0].LASTNAME,
                  firstname: result[0].FIRSTNAME,
                  token: token
                });
              }
            });
          }
        });
      }
    });
  });
};
