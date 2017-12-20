// Import your routes here
const { auth } = require('./routes/authentication.js');
const { expense } = require('./routes/expense.js');
const { User } = require('../database/models/user.js');
const { Rec } = require('../database/models/recurring.js');
const { One } = require('../database/models/oneTime.js');
const { jwtAuth } = require('./handlers/authentication.js');

// ***********************
const path = require('path');
const axios = require('axios');
const passport = require('passport');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
var plaid = require('plaid');
var moment = require('moment');
var envvar = require('envvar');

const { NODE_ENV } = process.env;

let webpackConfig;
if (NODE_ENV === 'development') {
  webpackConfig = '../webpack.config.dev';
} else {
  webpackConfig = '../webpack.config';
}

const config = require(webpackConfig);
const app = express();

require('dotenv').config();

app.set('port', process.env.PORT || 1337);
const port = app.get('port');

const compiler = webpack(config);
app.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
  noInfo: true,
  hot: true,
  historyApiFallback: true,
  stats: {
    colors: true,
  },
}));
app.use(webpackHotMiddleware(compiler));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(express.static(__dirname + '/../client/public'));

// Routes
app.use('/auth', auth); // Authentication route
app.use('/api/expense', expense);
/* **************************************************** */

/* ****DATABASE SCHEMA FOR RECURRING EXPENSE FOR REFERENCE**** */
// const recurringSchema = new mongoose.Schema({
//   expense: {
//     type: String,
//     unique: true
//   },
//   amount: Number,
//   period: String,
//   category: String,
//   startDate: Date
// });

/* ****DATABASE SCHEMA FOR ONE-TIME EXPENSE FOR REFERENCE**** */
// const oneTimeSchema = new mongoose.Schema({
//   expense: String,
//   amount: Number,
//   date: Date,
//   category: String
// });

// const userSchema = new mongoose.Schema({
//   //user has email, name, password, budget, and recurring/onetime as arrays of expense models
//   email: {
//     type: String,
//     unique: true,
//     lowercase: true,
//     trim: true,
//     validate: [{ isAsync: false, validator: isEmail, msg: 'Invalid Email Address' }],
//     required: 'Please supply an email address'
//   },
//   name: {
//     type: String,
//     required: 'Please supply a name',
//     trim: true
//   },
//   password: {
//     type: String,
//     required: 'Please supply a password'
//   },
//   resetPasswordToken: String,
//   resetPasswordExpires: Date,
//   budget: Number,
//   googleId: String,
//   googleToken: String,
//   recurring: [recurringSchema],
//   oneTime: [oneTimeSchema],
//   imageUrl: String
// });

//PLAID FINANCE API ROUTES






//PLAID FINANCE API ROUTSE

app.post('/calculateNPV', function(req, res) {
  var { initialInvestment, discountRate, cashFlow, infinityArray } = req.body;
  console.log('THIS IS THE DISCOUNT RATE', discountRate);
  var result = initialInvestment * -1;
  console.log('INFINITY ARRAY', infinityArray);
  Object.keys(cashFlow).forEach(year => {
    console.log('THIS IS THE YEAR EVALUATED', year);
    if (infinityArray.includes(Number(year))) {
      console.log('THIS GETS HIT');
      if (cashFlow[year][1] === '%') {
        result += initialInvestment * cashFlow[year][0] * 0.01 / (discountRate * 0.01);
      } else {
        result += cashFlow[year][0] / (discountRate * 0.01);
        console.log('THIS GETS HITTTT', cashFlow[year][0], '/////' ,1 - discountRate * 0.01);
      }
      console.log('THIS IS THE RESULT', result);
    } else {
      var earning;
      var yearMinusInfinity = year - infinityArray.filter((element) => year > element).length;
      if (cashFlow[year][1] === '%') {
        earning = initialInvestment * cashFlow[year][0] * 0.01;
      } else {
        earning = cashFlow[year][0];
      }
      result += Math.pow((100 - discountRate) * 0.01, Number(yearMinusInfinity)) * earning;
    }
  })

  res.send(JSON.stringify(Math.round(result)));
  res.end();
})

app.post('/updateBalance', function(req, res) {
  User.findOneAndUpdate({ email: req.body.email },
    {
      $set: { budget: req.body.budget, currency: req.body.currency }
    }, (err, user) => {
      console.log(user);
      res.send('success')
      res.end();
    }
  )
})

app.post('/reset', function(req, res) {
  User.findOneAndUpdate({ email: req.body.email }, {
    $set: { oneTime: [], recurring: [] }
  }, (err, user) => {
    res.send('success');
    res.end();
  })
})

app.post('/user', function(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    res.send(user);
    res.end();
  })
})

app.post('/fetchBudget', function(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    res.send(String(user.budget));
    res.end();
  })
})

app.get('/logout', function(req, res) {
  req.session.destroy((err) => {
    if (err) throw err;
  })
  res.send('success');
  res.end();
})

app.post('/fetchOneExpenses', function(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    res.send(user.oneTime);
    res.end();
  })
})

app.post('/fetchRecExpenses', function(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    res.send(user.recurring);
    res.end();
  })
})

//weather-map API
app.post('/weather', function(req, res) {
  console.log(req.body);
  var lat = req.body.lat;
  var lon = req.body.lon;
  var url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&APPID=fe22cf91271784d706fc84ca44d54cc3`;
  axios.get(url).then(function(response) {
    var data = response.data;
    console.log('THIS IS THE WEATHER', response.data);
    var weather = {
      state: data.name,
      weather: data.weather[0].main + ' (' + data.weather[0].description + ')',
      temperature: data.main.temp
    };
    res.send(weather);
    res.end();
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

app.listen(port, () => {
  console.log('Express is listening hard on port 1337');
});

//PLAID API-------------------------------------------------------------
var PLAID_CLIENT_ID = envvar.string('PLAID_CLIENT_ID', process.env.PLAID_CLIENT_ID);
var PLAID_SECRET = envvar.string('PLAID_SECRET', process.env.PLAID_SECRET);
var PLAID_PUBLIC_KEY = envvar.string('PLAID_PUBLIC_KEY', process.env.PLAID_PUBLIC_KEY);
var PLAID_ENV = envvar.string('PLAID_ENV', 'sandbox');

var client = new plaid.Client(
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_PUBLIC_KEY,
  plaid.environments[PLAID_ENV]
);

app.post('/get_access_token', function(req, res, next) {
  var email = req.body.email;
  var PUBLIC_TOKEN = request.body.public_token;
  client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
    if (error != null) {
      var msg = 'Could not exchange public_token!';
      console.log(msg + '\n' + error);
      return res.json({
        error: msg
      });
    }
    var ACCESS_TOKEN = tokenResponse.access_token;
    var ITEM_ID = tokenResponse.item_id;
    console.log('Access Token: ' + ACCESS_TOKEN);
    console.log('Item ID: ' + ITEM_ID);
    User.findOneAndUpdate({ email: req.body.email },
      {
        $set: { plaidAccessToken: ACCESS_TOKEN, plaidItemId: ITEM_ID }
      }, (err, user) => {
        console.log(user);
        res.json({
          'error': false
        })
      }
    )
  });
});

app.post('/accounts', function(req, res, next) {
  // Retrieve high-level account information and account and routing numbers
  // for each account associated with the Item.
  var email = req.body.email;
  User.findOne({ email: email }, (err, user) => {
    if (err) throw err;
    var ACCESS_TOKEN = user.plaidAccessToken;
    client.getAuth(ACCESS_TOKEN, function(err, authResponse) {
      if (error != null) {
        var msg = 'Unable to pull accounts from the Plaid API.';
        console.log(msg + '\n' + err);
        return response.json({
          error: msg
        });
      }

      response.json({
        error: false,
        accounts: authResponse.accounts,
        numbers: authResponse.numbers,
      });
    });
  });
});

app.post('/item', function(req, res, next) {
  var email = req.body.email;
  User.findOne({ email: email }, (err, user) => {
    if (err) throw err;
    var ACCESS_TOKEN = user.plaidAccessToken;
    client.getItem(ACCESS_TOKEN, function(err, itemResponse) {
      if (err != null) {
        return response.json({
          error: err
        });
      }
      client.getInstitutionById(itemResponse.item.institution_id, function(err, instRes) {
        if (err != null) {
          var msg = 'Unable to pull institution information from the Plaid API.';
          console.log(msg + '\n' + err);
          return response.json({
            error: msg
          });
        } else {
          response.json({
            item: itemResponse.item,
            institution: instRes.institution,
          });
        }
      });
    });
  });
});

app.post('/transactions', function(req, res, next) {
  var email = req.body.email;
  User.findOne({ email: email }, (err, user) => {
    if (err) throw err;
    var ACCESS_TOKEN = user.plaidAccessToken;
    var startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    var endDate = moment().format('YYYY-MM-DD');
    client.getTransactions(ACCESS_TOKEN, startDate, endDate, {
      count: 250,
      offset: 0,
    }, function(err, transactionsResponse) {
      if (error != null) {
        return response.json({
          error: err
        });
      }
      console.log('pulled ' + transactionsResponse.transactions.length + ' transactions');
      response.json(transactionsResponse);
    });
  });
});

//PLAID API-------------------------------------------------------------
