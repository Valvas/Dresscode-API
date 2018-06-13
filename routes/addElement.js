'use strict';

var mysql = require('mysql');
var db= require('../db/dbProperties');
var connection = mysql.createConnection(db.connection);

module.exports = function(app) {

  function existsElement(name, callback) {
    connection.query('SELECT * FROM element WHERE name = ? LIMIT 1', [name], function(err, result) {
        if (err) callback(err.message);
        else {
            callback(null, result[0]);
        }
    });
  }

  app.post('/addElement', function(req, res) {

    existsElement(req.body.name, function(err, element){
        if (err) res.status(500).send(err);
        if(!element) {
            element = {
                name: req.body.name,
                image: req.body.image,
                type_id: req.body.type_id
                //user_id: req.body.user_id,
            };
            var color = req.body.color_id;
            var elementId;
            connection.query('INSERT INTO element SET ?', [element], function(err, result){
                if (err) res.status(500).send(err.message);
                else {
                  elementId = result.insertId;

                  var x = 0;
                  var loop = () =>
                  {
                    if(typeof(color[x]) != "number") {
                      res.status(406).send("Il ne s'agit pas d'id de couleurs");
                    }
                    else {
                      connection.query(`INSERT INTO element_x_color VALUES(?,?)`, [color[x], elementId], function(err, result){
                          if (err) res.status(500).send(err.message);

                          if((x += 1) < (color.length - 1)) loop();

                          else {
                            res.status(201).send("OK");
                          }
                      });
                    }
                  }
                  loop();
                }
            });
        }
        else {
          res.status(406).send("Un élément avec ce nom éxiste déjà");
        }
    });
  });

};
