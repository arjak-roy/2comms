var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var authRouter = require('./routes/auth-routes');
var superadminRouter = require('./routes/superadminRouter')
var adminClient = require('./routes/clientadmin-routes')
var hrrouter = require('./routes/hr-routes')
var managerRouter = require('./routes/manager-routes')
var employeeRouter = require('./routes/employee')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(cors({
    origin: ['https://hrms-cec00.web.app', 'https://hrms-cec00.web.app', 'http://localhost:5173'], // Your frontend URL
    credentials: true,            // Allows cookies to be sent,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', authRouter);
app.use('/superadmin', superadminRouter);
app.use('/clientadmin', adminClient);
app.use('/hr', hrrouter);
app.use('/manager', managerRouter);
app.use('/employee', employeeRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
