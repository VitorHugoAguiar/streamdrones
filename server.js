const express = require("express");
const streams = require('./app/streams.js')();
const bodyParser = require('body-parser');
const app = express();
const server = require("http").Server(app);
const bcrypt = require("bcrypt");
const passport = require("passport");
const initializePassport = require("./passport-config");
const flash = require("express-flash");
const session = require("express-session");
const MemoryStore = require('memorystore')(session)
const methodOverride = require("method-override");




const mysql = require("mysql2")

const db = mysql.createConnection({
  host: 'dokku-mysql-dronestream-db',
  user: 'mysql',
  password: '3f788bcbf30f8012',
  database: 'dronestream_db',
  port: '3306'
})

db.connect((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("MySql connected...")
  }
})


initializePassport(
  passport,
  email => {
    // Replace with your actual query to get a user by email
    const sql = "SELECT * FROM users WHERE email = ?";
    return new Promise((resolve, reject) => {
      db.query(sql, [email], (error, results) => {
        if (error) reject(error);
        resolve(results[0]);
      });
    });
  },
  id => {
    // Replace with your actual query to get a user by ID
    const sql = "SELECT * FROM users WHERE id = ?";
    return new Promise((resolve, reject) => {
      db.query(sql, [id], (error, results) => {
        if (error) reject(error);
        resolve(results[0]);
      });
    });
  }
);

app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  maxHttpBufferSize: 1e8, // change socket io max transfer buffer size
  pingTimeout: 60000,
  cors: {
    origin: '*'
  }
});

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  secret: '123456789',
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routing
require('./app/routes.js')(app, streams, bcrypt, passport, db);

io.on("connection", (socket) => {

  socket.on("disconnect", () => {
    //console.log("user disconnected");
  });

});

//#######################################################################
//const port = process.env.PORT;
server.listen(5000, () => {
  console.log('Server started on Port ' + 5000)
});

require('./app/socketHandler.js')(io, streams, db);
