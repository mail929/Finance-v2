var express = require('express')
var router = express.Router()

// connect to db
var mysql = require('mysql')
var config = require('../sql-config.json')
var connection = mysql.createPool(config)

var utils = require('./utils')

router.get('/', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    connection.query(`SELECT right(session_key, 4) as session_key, last_accessed, description FROM sessions
                      WHERE user_id = ${user_id}`, function (error, results, fields)
    {
      if (error) 
      {
        console.log(error)
        res.render('settings', { error_text: req.query.error_text, keys: [] })
      }
      else
      {
        res.render('settings', { error_text: req.query.error_text, keys: results })
      }
    })
  })
})

router.get('/rmsession', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    connection.query(`DELETE FROM sessions
                      WHERE right(session_key, 4) = "${req.query.key}"
                        and user_id = ${user_id}`, function (error, results, fields)
    {
      if (error)
      {
        console.log(error)
        res.redirect(`/settings?error_text=Error deleting key ${req.query.key}`)
      }
      else
      {
        res.redirect('/settings')
      }
    })
  })
})

router.post('/chusername', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    connection.query(`UPDATE users SET username = "${req.body.user}"
                      WHERE id = ${user_id} and password = password("${req.body.pass}")`, function (error, results, fields)
    {
      if (error)
      {
        console.log(error)
        res.redirect('/settings?error_text=Username already exists')
      }
      else
      {
        connection.query(`SELECT username FROM users
                          WHERE id = ${user_id} and username = "${req.body.user}"`, function (error, results, fields)
        {
          if (error) 
          {
            console.log(error)
            res.redirect('/settings?error_text=Error changing username')
          }
          else if (results.length == 0) 
          {
            console.log(error)
            res.redirect('/settings?error_text=Incorrect password')
          }
          else
          {
            res.redirect('/settings?error_text=Successfully updated username')
          }
        })
      }
    })
  })
})

router.post('/chpassword', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    if (req.body.new1 == req.body.new2)
    {
      connection.query(`UPDATE users SET password = password("${req.body.new1}")
                        WHERE id = ${user_id} and password = password("${req.body.old}")`, function (error, results, fields)
      {
        if (error) 
        {
          console.log(error)
          res.redirect('/settings?error_text=Error changing password')
        }
        else
        {
          connection.query(`SELECT username FROM users
                            WHERE id = ${user_id} and password = password("${req.body.new1}")`, function (error, results, fields)
          {
            if (error) 
            {
              console.log(error)
              res.redirect('/settings?error_text=Error changing password')
            }
            else if (results.length == 0) 
            {
              console.log(error)
              res.redirect('/settings?error_text=Incorrect password')
            }
            else
            {
              res.redirect('/settings?error_text=Successfully updated password')
            }
          })
        }
      })
    }
    else
    {
      res.redirect('/settings?error_text=Passwords do not match')
    }
  })
})

router.get('/logout', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    let session = req.cookies.session
    res.redirect(`/settings/rmsession?key=${session.substr(session.length - 4)}`)
  })
})

router.get('/delete-account', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    connection.query(`SELECT username FROM users
                      WHERE id = ${user_id} and password = password("${req.query.password}")`, function (error, results, fields)
    {
      if (error)
      {
        console.log(error)
        res.redirect(`/settings?error_text=Error deleting account`)
      }
      else if (results.length > 0)
      {
        connection.query(`DELETE FROM transactions
                          WHERE user_id = ${user_id}`, function (error, results, fields)
        {
          if (error)
          {
            console.log(error)
            res.redirect(`/settings?error_text=Error deleting transactions`)
          }
          else
          {
            connection.query(`DELETE FROM accounts
                              WHERE user_id = ${user_id}`, function (error, results, fields)
            {
              if (error)
              {
                console.log(error)
                res.redirect(`/settings?error_text=Error deleting accounts`)
              }
              else
              {
                connection.query(`DELETE FROM sessions
                                  WHERE user_id = ${user_id}`, function (error, results, fields)
                {
                  if (error)
                  {
                    console.log(error)
                    res.redirect(`/settings?error_text=Error deleting sessions`)
                  }
                  else
                  {
                    connection.query(`DELETE FROM users
                                      WHERE id = ${user_id}`, function (error, results, fields)
                    {
                      if (error)
                      {
                        console.log(error)
                        res.redirect(`/settings?error_text=Error deleting account`)
                      }
                      else
                      {
                        res.redirect('/settings')
                      }
                    })
                  }
                })
              }
            })
          }
        })
      }
      else
      {
        res.redirect(`/settings?error_text=Invalid password`)
      }
    })
  })
})

module.exports = router