'use strict';

var mysql = require('mysql');
var db= require('../db/dbProperties');
var connection = mysql.createConnection(db.connection);
var _ = require('lodash');
var jwt = require('jsonwebtoken');

module.exports = function(app) {

    var secretKey = "secretKey"; // TODO:
    function createToken(user) {
        return jwt.sign(_.omit(user, 'password'), secretKey, { expiresIn: 60*60*5 });
    }

    function getUserDB(email, done) {
        connection.query('SELECT * FROM users WHERE mail = ? LIMIT 1', [email], function(err, rows, fields) {
            if (err) throw err;
            done(rows[0]);
        });
    }

  app.post('/signIn', function(req, res) {
    getUserDB(req.body.email, function(user){
      if (!user) {
        return res.status(406).send("Un des identifiants est incorect");
      }
      else if (user.PASSWORD !== req.body.password) {
          return res.status(406).send("Un des identifiants est incorect");
      }
      res.status(201).send({
        email: user.MAIL,
        password: user.PASSWORD,
        firstname: user.FIRSTNAME,
        lastname: user.LASTNAME ,
        id_token: createToken(user),
        user_id: user.USER_ID,
      });
    });
  });

};
