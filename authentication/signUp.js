'use strict';

var mysql = require('mysql');
var db= require('../db/dbProperties');
var connection = mysql.createConnection(db.connection);
var _ = require('lodash');
var jwt = require('jsonwebtoken');

module.exports = function(app) {

    var secretKey = "secretKey";
    function createToken(user) {
        return jwt.sign(_.omit(user, 'password'), secretKey, { expiresIn: 60*60*5 });
    }

    function getUserDB(email, done) {
        connection.query('SELECT * FROM users WHERE mail = ? LIMIT 1', [email], function(err, rows, fields) {
            if (err) throw err;
            done(rows[0]);
        });
    }

    app.post('/signUp', function(req, res) {
      getUserDB(req.body.email, function(user){
          if(!user) {
              user = {
                  mail: req.body.email,
                  password: req.body.password,
                  firstname: req.body.firstname,
                  lastname: req.body.lastname
              };
              connection.query('INSERT INTO users SET ?', [user], function(err, result){
                  if (err) throw err;
                  res.status(201).send({
                    email: user.MAIL,
                    password: user.PASSWORD,
                    firstname: user.FIRSTNAME,
                    lastname: user.LASTNAME ,
                    id_token: createToken(user)
                  });
              });
          }
          else res.status(406).send("Un utilisateur avec cette adresse email éxiste déjà");
      });
    });

};
