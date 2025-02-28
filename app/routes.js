module.exports = function (app, streams, bcrypt, passport, db) {
  // Configuring the register post functionality
  app.post("/login", checkNotAuthenticated, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  }))

  // Configuring the register post functionality
  app.post("/register", checkNotAuthenticated, async (req, res) => {
    try {
      const { name, email, password, password_confirm } = req.body

      // Check if passwords match
      if (password !== password_confirm) {
        // If passwords do not match, send an error message
        req.flash('error', 'Passwords do not match');
        req.session.formData = { name, email };
        return res.redirect('/register');
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const sql = "INSERT INTO users (email, name, password) VALUES (?, ?, ?)";
      db.query(sql, [email, name, hashedPassword], (error, results) => {
        if (error) {
          console.log(error);
          req.flash('error', 'Error during registration'); // Use flash to send error message
          res.redirect('/register');
        } else {
          res.redirect('/login');
        }
      });
    } catch {
      req.flash('error', 'Error during registration');
      res.redirect('/register');
    }
  });

  // GET home 
  var index = function (req, res) {
    res.render("index.ejs", {
      name: req.user.name,
      id: req.params.id
    })
  };

  // GET streams as JSON
  var displayStreams = function (req, res) {
    var streamList = streams.getStreams();
    // JSON exploit to clone streamList.public
    var data = (JSON.parse(JSON.stringify(streamList)));
    res.status(200).json(data);
  };
  app.get('/streams.json', displayStreams);

  app.get('/', checkAuthenticated, index);

  app.get('/login', checkNotAuthenticated, checkEmailFormat, (req, res) => {
    res.render("login.ejs");
  });
  app.get('/register', checkNotAuthenticated, (req, res) => {
    const formData = req.session.formData || { name: '', email: '' };
    req.session.formData = null; // Clear the form data after using it
    res.render("register.ejs", formData);
  });

  /*app.get('/register', checkNotAuthenticated, checkEmailFormat, (req, res) => {
    res.redirect('/login');
  });*/
  // End Routes

  app.delete("/logout", (req, res) => {
    req.logout(req.user, err => {
      if (err) return next(err)
      res.redirect("/")
    })
  })

  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect("/login")
  }

  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/")
    }
    next()
  }

  function checkEmailFormat(req, res, next) {
    const email = req.body.email;
    if (email && !email.includes('@')) {
      req.flash('error', 'Invalid email address');
      return res.redirect('/login');
    }
    next();
  }
}