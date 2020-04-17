var express = require('express');
var router = express.Router();

// connect to db
var mysql = require('mysql');
var config = require('../sql-config.json')
var connection = mysql.createPool(config);

/**
 * Homepage
 */
router.get('/', function(req, res, next)
{
  if (req.cookies.uid === undefined)  res.redirect('/login');
  else                                res.render('index', { title: 'Finance', name: req.cookies.name });
});

/**
 * Login
 */
router.get('/login', function(req, res, next)
{
  res.render('login', { title: 'Finance Login' });
});

router.post('/login', function(req, res, next)
{
  connection.query(`SELECT id FROM users \
                    WHERE username = "${req.body.user}" and password = password("${req.body.pass}")`, function (error, results, fields)
  {
    if      (error) res.send(error);
    else if (results.length > 0)
    {
      res.cookie('uid', results[0].id);
      res.cookie('name', req.body.user);
      res.redirect('/');
    }
    else res.redirect('/login');
  });
});

/**
 * Add Entry
 */
router.get('/add', function(req, res, next)
{
  if (req.cookies.uid === undefined)  res.redirect('/login');
  else                                res.render('add', { title: 'Finance' });
});

router.post('/add', function(req, res, next)
{
  date        = 'now()';
  if (req.body.date != '')
  {
    date      = `"${req.body.date}"`;
  }
  uid         = `"${req.cookies.uid}"`;
  account     = `"${req.body.account}"`;
  title       = `"${req.body.title}"`;
  location    = `"${req.body.location}"`;
  amount      = `"${req.body.amount}"`;
  categories  = `"${req.body.categories}"`;

  connection.query(`SELECT id FROM accounts \
                    WHERE user_id = ${uid} and name = ${account}`, function (error, results, fields)
  {
    if      (error) res.send(error);
    else if (results.length > 0)
    {
      account = `"${results[0].id}"`;
      connection.query(`INSERT INTO transactions (user_id, account_id, date, title, location, amount, categories)\
                        VALUES (${uid}, ${account}, ${date}, ${title}, ${location}, ${amount}, ${categories})`, function (error, results, fields)
      {
        if (error)  res.send(error);
        else        res.redirect('/add');
      });
    }
    else res.send('No account, ' + account + ', found');
  });
});

/**
 * Add Account
 */
router.get('/add-account', function(req, res, next)
{
  if (req.cookies.uid === undefined)  res.redirect('/login');
  else                                res.render('add-account', { title: 'Finance' });
});

router.post('/add-account', function(req, res, next)
{
  uid   = `"${req.cookies.uid}"`;
  name  = `"${req.body.name}"`;

  connection.query(`SELECT id FROM accounts \
                    WHERE user_id = ${uid} and name = ${name}`, function (error, results, fields)
  {
    if      (error)               res.send(error);
    else if (results.length > 0)  res.send('Account already exists');
    else
    {
      connection.query(`INSERT INTO accounts (user_id, name)\
                        VALUES (${uid}, ${name})`, function (error, results, fields)
      {
        if (error)  res.send(error);
        else        res.redirect('/add-account');
      });
    }
  });
});

/**
 * Account Balances
 */
router.get('/accounts', function(req, res, next)
{
  if (req.cookies.uid === undefined)
  {
    res.redirect('/login');
    return;
  }

  connection.query(`SELECT sum(amount), name \
                    FROM transactions as t \
                    INNER JOIN accounts as a ON account_id = a.id \
                    WHERE t.user_id = "${req.cookies.uid}" \
                    GROUP BY account_id`, function (error, results, fields)
  {
    if      (error)               res.send(error);
    else if (results.length > 0)  res.render('balances', { title: 'Finance', accounts: results});
    else                          res.send("No accounts found");
  });
});

/**
 * Transaction History
 */
router.get('/history', function(req, res, next)
{
  if (req.cookies.uid === undefined)
  {
    res.redirect('/login');
    return;
  }

  limit = 10;
  if (req.query.limit !== undefined)  limit = req.query.limit;

  title = req.query.title;
  if (title === undefined || title == '') title = '';
  else                                    title = `AND t.title LIKE "%${title}%"`;

  location = req.query.location;
  if (location === undefined || location == '') location = '';
  else                                          location = `AND t.location = "${location}"`;

  account = req.query.account;
  if (account === undefined || account == '') account = '';
  else                                        account = `AND a.name = "${account}"`;

  before = req.query.before;
  if (before === undefined || before == '') before = '';
  else                                      before = `AND datediff(t.date, "${before}") < 0`;

  after = req.query.after;
  if (after === undefined || after == '') after = '';
  else                                    after = `AND datediff(t.date, "${after}") >= 0`;

  connection.query(`SELECT *, a.name FROM transactions as t \
                    INNER JOIN accounts as a ON account_id = a.id \
                    WHERE t.user_id = "${req.cookies.uid}" ${title} ${location} ${account} ${before} ${after} \
                    LIMIT ${limit}`, function (error, results, fields)
  {
    if      (error)               res.send(error);
    else if (results.length > 0)  res.render('history', { title: 'Finance', entries: results });
    else                          res.send("No history found");
  });
});

module.exports = router;