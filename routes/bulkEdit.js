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
        connection.query(`SELECT DISTINCT location FROM transactions
                      WHERE user_id = ${user_id}`, function (error, locations, fields)
        {
            if (error || locations.length <= 0)
            {
                locations = {}
            }
            connection.query(`SELECT DISTINCT name FROM accounts
                                WHERE user_id = ${user_id}`, function (error, accounts, fields)
            {
                if (error || accounts.length <= 0)
                {
                    accounts = {}
                }
                connection.query(`SELECT DISTINCT category FROM transactions
                                WHERE user_id = ${user_id}`, function (error, categories, fields)
                {
                    if (error || categories.length <= 0)
                    {
                        categories = {}
                    }
                    
                    res.render('bulkEdit', { error_text: req.query.error_text, title: 'Finance | Bulk Edit', query: req.query, accounts: accounts, categories: categories, locations: locations })
                })
            })
        })
    })
})

router.post('/', function(req, res, next)
{
  utils.session_exists(connection, req, res, function (user_id)
  {
    let title_str       = typeof(req.body.loose_title) !== 'undefined' ? '"%$VALUE%"' : '"$VALUE"'
    let location_str    = typeof(req.body.loose_location) !== 'undefined' ? '"%$VALUE%"' : '"$VALUE"'
    let category_str    = typeof(req.body.loose_category) !== 'undefined' ? '"%$VALUE%"' : '"$VALUE"'
    let note_str        = typeof(req.body.loose_note) !== 'undefined' ? '"%$VALUE%"' : '"$VALUE"'
    let title     = utils.create_clause(req.body.title, `AND t.title LIKE ${title_str}`)
    let location  = utils.create_clause(req.body.location, `AND t.location LIKE ${location_str}`)
    let account   = utils.create_clause(req.body.account, 'AND a.name = "$VALUE"')
    let before    = utils.create_clause(req.body.before, `AND datediff(t.date, ${utils.process_date(req.body.before)}) < 0`)
    let after     = utils.create_clause(req.body.after, `AND datediff(t.date, ${utils.process_date(req.body.after)}) > 0`)
    let date      = utils.create_clause(req.body.date, `AND datediff(t.date, ${utils.process_date(req.body.date)}) = 0`)
    let category  = utils.create_clause(req.body.category, `AND t.category LIKE ${category_str}`)
    let note      = utils.create_clause(req.body.note, `AND t.note LIKE ${note_str}`)
    let new_title       = utils.create_clause(req.body.new_title, 't.title = "$VALUE"')
    let new_location    = utils.create_clause(req.body.new_location, 't.location = "$VALUE"')
    let new_account     = utils.create_clause(req.body.new_account, `t.account_id = (SELECT id FROM accounts WHERE name = "$VALUE" and user_id = ${user_id})`)
    let new_date        = utils.create_clause(req.body.new_date, 't.date = "$VALUE"')
    let new_category    = utils.create_clause(req.body.new_category, 't.category = "$VALUE"')
    let new_note        = utils.create_clause(req.body.new_note, 't.note = "$VALUE"')
    let set = ''
    let sets = [new_title, new_location, new_account, new_date, new_category, new_note]
    sets.forEach(function (item, index) {
        if (item != '')
        {
            if (set != '')
            {
                set += ', '
            }
            set += item
        }
    })
    
    connection.query(`UPDATE transactions as t, accounts as a SET ${set}
                      WHERE t.user_id = ${user_id} AND a.user_id = ${user_id} ${title} ${location} ${account} ${before} ${date} ${after} ${category} ${note}`,
                    function (error, results, fields)
    {
        let queryStr = ''
        let queries = {'title': req.body.title, 'location': req.body.location, 'account': req.body.account, 'before': req.body.before, 'after': req.body.after, 'date': req.body.date, 'category': req.body.category, 'note': req.body.note}
        let new_queries = {'title': req.body.new_title, 'location': req.body.new_location, 'account': req.body.new_account, 'date': req.body.new_date, 'category': req.body.new_category, 'note': req.body.new_note}
        let loose_queries = {'title': req.body.loose_title, 'location': req.body.loose_location, 'category': req.body.loose_category, 'note': req.body.loose_note}

        if (error)
        {
            console.log(error)
            Object.keys(queries).forEach(function (key, index) {
                if (queries[key])
                {
                    queryStr += `&${key}=${queries[key]}`
                }
            })
            Object.keys(new_queries).forEach(function (key, index) {
                if (new_queries[key])
                {
                    queryStr += `&new_${key}=${new_queries[key]}`
                }
            })
            Object.keys(loose_queries).forEach(function (key, index) {
                if (loose_queries[key])
                {
                    queryStr += `&loose_${key}=${loose_queries[key]}`
                }
            })
            res.redirect(`/bulkEdit?error_text=Error making search${queryStr}`)
        }
        else
        {
            queryStr = '?'
            Object.keys(queries).forEach(function (key, index) {
                let query = queries[key]
                if (new_queries[key])
                {
                    query = new_queries[key]
                }
                if (query)
                {
                    if (queryStr != '?')
                    {
                        queryStr += '&'
                    }
                    queryStr += `${key}=${query}`
                }
            })
            res.redirect(`/history${queryStr}`)
        }
    })
  })
})

module.exports = router