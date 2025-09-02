require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var hotelsRouter = require('./routes/hotels');
var roomsRouter = require('./routes/rooms');

var db = require("./models");

// Database initialization with better error handling
async function initializeDatabase() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // For production, use force: true to recreate tables if they don't exist
    // This will only run once to set up the initial schema
    const syncOptions = {
      force: process.env.FORCE_DB_SYNC === 'true',
      alter: process.env.NODE_ENV === 'production' && process.env.FORCE_DB_SYNC !== 'true'
    };
    
    await db.sequelize.sync(syncOptions);
    console.log('Database synchronized successfully.');
    
    // List all tables to verify they were created
    const tables = await db.sequelize.getQueryInterface().showAllTables();
    console.log('Available tables:', tables);
    
    // If hotels table doesn't exist, create it manually
    if (!tables.includes('Hotels') && !tables.includes('hotels')) {
      console.log('Hotels table not found, creating manually...');
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS Hotels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          Name VARCHAR(255),
          Location VARCHAR(255)
        );
      `);
      
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS Rooms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          RoomNumber VARCHAR(255),
          Price DECIMAL(10,2),
          HotelId INT,
          FOREIGN KEY (HotelId) REFERENCES Hotels(id)
        );
      `);
      
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS Users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          Username VARCHAR(255) UNIQUE,
          Password VARCHAR(255)
        );
      `);
      
      console.log('Tables created manually.');
    }
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    // Don't crash the app, but log the error
  }
}

initializeDatabase();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'random text',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore()
}));
app.use(passport.authenticate('session'));

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/users', usersRouter);
app.use('/hotels', hotelsRouter);
app.use('/rooms', roomsRouter);

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
