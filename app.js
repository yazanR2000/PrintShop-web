const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require('mongoose-findorcreate');
const dateFormat = require("dateformat");
const async = require('async');



require('dotenv/config');

const app = express();




app.use(express.static("public"));

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }, err => {
    console.log('connected');
});
mongoose.set('useFindAndModify', false);


// Attempt to connect and execute queries if connection goes through

const User = require('./user');
const Order = require('./order');
passport.use(User.createStrategy());


passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
    /*userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"*/
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOne({ googleId: profile.id }, function (err, user) {
            if (err) {
                return cb(err);
            }
            if (user) {
                return cb(err, user);
            } else {
                var full = _.split(profile.displayName, ' ', 2);
                console.log(full);
                var newUser = User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    firstname: full[0],
                    lastname: full[1]
                });
                newUser.save();
                return cb(err, newUser);
            }
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'emails', 'displayName']
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOne({ facebookId: profile.id }, function (err, user) {
            if (err) {
                return cb(err);
            }
            if (user) {
                return cb(err, user);
            } else {
                var full = _.split(profile.displayName, ' ', 2);
                console.log(full);
                var newUser = User({
                    facebookId: profile.id,
                    email: profile.emails[0].value,
                    firstname: full[0],
                    lastname: full[1]
                });
                newUser.save();
                return cb(err, newUser);
            }
        });
    }
));

var collections = require("./model");
const { Passport } = require("passport");
const { findById } = require("./user");
const { template } = require("lodash");


app.get("/", function (req, res) {
    if (req.isAuthenticated()) {
        console.log('AUTH : ' + req.user.id);
        collections.find({}, function (err, items) {
            if (err) {
                console.log(err);
            } else {
                //console.log(items);
                res.render('home', { items: items, login: true });
            }
        });
    } else {
        collections.find({}, function (err, items) {
            if (err) {
                console.log(err);
            } else {
                //console.log(items);
                res.render('home', { items: items, login: false });
            }
        });
    }

});
app.patch('/', async function (req, res) {
    console.log(req.body);
    var path = _.split(_.trim(req.body.path), '/', 5);
    console.log(path);
    var type = path[2];
    var topic = path[3];
    var id = parseInt(path[4]);

    console.log(id);




    var colorAndIndex = _.split(_.trim(req.body.color), ' ', 2);

    var index = colorAndIndex[1];
    console.log(index);
    var product = {
        _id: Date.now(),
        image: {},
        size: req.body.size,
        color: colorAndIndex[0],
        quantity: req.body.qty,
        price: req.body.price,
        path: type + '/' + topic + '/' + id
    };
    console.log(_.upperFirst(type));
    try {
        await collections.findOne({ title: _.upperFirst(type), topic: 'normal' }, function (err, item) {
            if (err) {
                console.log(err);
            } else if (item) {
                console.log('found');
                product.image = item.products[id - 1].colors[index].img;
                console.log(product);
                if (product.image !== null) {
                    User.findOne({ _id: req.user.id }, function (err, user) {
                        if (err) {
                            console.log(err);
                        } else if (user) {
                            console.log('found');
                            console.log(user);
                            var cart = user.cart;
                            if (cart.length !== 0) {
                                var i;
                                for (i = 0; i < cart.length; i++) {
                                    if ((cart[i].path === product.path) && (cart[i].color === product.color) && (cart[i].size === product.size)) {
                                        break;
                                    }
                                }
                                if (i === cart.length) {
                                    cart.push(product);
                                } else {
                                    cart[i].quantity += product.quantity;
                                }
                            } else {
                                cart.push(product);
                            }
                            var cartTotal = req.user.cartTotal + (product.price * product.quantity);
                            User.updateOne({ _id: req.user.id }, { cart: cart, cartTotal: cartTotal }, function (err, done) {
                                if (err) {
                                    console.log('Somthing went wrong!');
                                    console.log(err);
                                } else {
                                    console.log('Item added successfully!');
                                    res.json({ done: true });
                                    res.end();
                                }
                            });
                        }
                    });
                } else {
                    res.json({ done: false });
                    res.end();
                }

            } else {
                console.log('notfound');
            }
        });
    } catch (err) {
        console.log(err);
        res.json({ done: false });
        res.end();
    }
});
app.get('/sizes/guide', function (req, res) {
    res.render('guide', { login: true });
});
/*profile*/
app.get('/profile/settings', function (req, res) {
    res.render('profile/settings', { login: true, fname: req.user.firstname, lname: req.user.lastname, email: req.user.email, phone: req.user.phoneNumber });
});
app.patch('/profile/settings', function (req, res) {
    console.log(req.body);
    User.findByIdAndUpdate({ _id: req.user.id }, {
        firstname: req.body.First,
        lastname: req.body.Last,
        phoneNumber: req.body.Phone,
        email: req.body.email
    }, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            console.log(user);
            res.json({
                done: true
            });
            res.end();
        }
    });
});
/*profile*/

app.get('/product/:type/:topic/:id', function (req, res) {
    var type = req.params.type;
    var id = parseInt(req.params.id);
    var topic = req.params.topic;
    if (req.isAuthenticated()) {

        collections.findOne({ title: _.upperFirst(type), topic: 'normal' }, function (err, item) {
            if (err) {
                console.log(err);
            } else if (item) {
                console.log(item);
                res.render('product-info', {
                    product: item.products[id - 1].colors,
                    price: item.products[id - 1].price,
                    name: item.products[id - 1].name,
                    sizes: item.products[id - 1].sizes,
                    type: type,
                    topic: topic,
                    id: id,
                    like:item.products,
                    login: true
                });

            } else {
                console.log('not found');
            }
        });
    } else {
        collections.findOne({ title: _.upperFirst(type), topic: 'normal' }, function (err, item) {
            if (err) {
                console.log(err);
            } else if (item) {
                console.log(item);
                res.render('product-info', {
                    product: item.products[id - 1].colors,
                    price: item.products[id - 1].price,
                    name: item.products[id - 1].name,
                    sizes: item.products[id - 1].sizes,
                    type: type,
                    topic: topic,
                    id: id,
                    like:item.products,
                    login: false
                });
            } else {
                console.log('not found');
            }
        });
    }
});
app.patch('/product/:type/:topic/:id', async function (req, res) {
    var type = req.params.type;
    var topic = req.params.topic;
    var id = parseInt(req.params.id);

    console.log(id);


    console.log(req.body);

    var colorAndIndex = _.split(_.trim(req.body.color), ' ', 2);

    var index = parseInt(colorAndIndex[1]);
    console.log(colorAndIndex);
    console.log(index);
    var product = {
        _id: Date.now(),
        image: {},
        size: req.body.size,
        color: colorAndIndex[0],
        quantity: req.body.qty,
        price: req.body.price,
        path: type + '/' + topic + '/' + id
    };
    console.log(_.upperFirst(type));
    try {
        await collections.findOne({ title: _.upperFirst(type), topic: 'normal' }, function (err, item) {
            if (err) {
                console.log(err);
            } else if (item) {
                console.log('found');
                product.image = item.products[id - 1].colors[index].img;


                console.log(product);
                if (product.image !== null) {
                    User.findOne({ _id: req.user.id }, function (err, user) {
                        if (err) {
                            console.log(err);
                        } else if (user) {
                            console.log('found');
                            console.log(user);
                            var cart = user.cart;
                            if (cart.length !== 0) {
                                var i;
                                for (i = 0; i < cart.length; i++) {
                                    if ((cart[i].path === product.path) && (cart[i].color === product.color) && (cart[i].size === product.size)) {
                                        break;
                                    }
                                }
                                if (i === cart.length) {
                                    cart.push(product);
                                } else {
                                    cart[i].quantity += product.quantity;
                                }
                            } else {
                                cart.push(product);
                            }
                            var cartTotal = req.user.cartTotal + (product.price * product.quantity);
                            User.updateOne({ _id: req.user.id }, { cart: cart, cartTotal: cartTotal }, function (err, done) {
                                if (err) {
                                    console.log('Somthing went wrong!');
                                    console.log(err);
                                } else {
                                    console.log('Item added successfully!');
                                    res.json({ done: true });
                                    res.end();
                                }
                            });
                        }
                    });
                } else {
                    res.json({ done: false });
                    res.end();
                }

            } else {
                console.log('notfound');
            }
        });
    } catch (err) {
        console.log(err);
        res.json({ done: false });
        res.end();
    }
});


/*google login........................*/
app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile", 'email'] })
);

app.get("/auth/google/printaholic",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
    });
/*google login........................*/



/*facebook login.....................................*/
app.get('/auth/facebook',
    passport.authenticate('facebook')
);

app.get("/auth/facebook/printaholic",
    passport.authenticate('facebook', { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
    });
/*facebook login.......................................*/

/*..................*/

app.get("/:id/:topic", function (req, res) {
    var type = req.params['id'];
    console.log(type);
    var topic = req.params['topic'];
    if (req.isAuthenticated()) {

        //console.log(_.upperFirst(type));
        collections.findOne({ title: _.upperFirst(type) }, function (err, item) {
            if (err) {
                console.log(err);
            } else {
                if (item) {
                    res.render('all', { item: item, type: type, topic: topic, login: true });
                } else {
                    console.log('not found');
                }
            }
        });
    } else {
        collections.findOne({ title: _.upperFirst(type) }, function (err, item) {
            if (err) {
                console.log(err);
            } else {
                if (item) {
                    res.render('all', { item: item, type: type, topic: topic, login: false });
                } else {
                    console.log('not found');
                }
            }
        });
    }
});
app.patch('/:id/:topic', async function (req, res) {
    console.log(req.body);
    var path = _.split(_.trim(req.body.path), '/', 5);
    console.log(path);
    var type = _.upperFirst(path[2]);
    var topic = path[3];
    var id = parseInt(path[4]);

    console.log(id);




    var colorAndIndex = _.split(_.trim(req.body.color), ' ', 2);

    var index = colorAndIndex[1];
    console.log(index);
    var product = {
        _id: Date.now(),
        image: {},
        size: req.body.size,
        color: colorAndIndex[0],
        quantity: req.body.qty,
        price: req.body.price,
        path: type + '/' + topic + '/' + id
    };
    console.log(_.upperFirst(type));
    try {
        await collections.findOne({ title: _.upperFirst(type), topic: 'normal' }, function (err, item) {
            if (err) {
                console.log(err);
            } else if (item) {
                console.log('found');
                product.image = item.products[id - 1].colors[index].img;
                console.log(product);
                if (product.image !== null) {
                    User.findOne({ _id: req.user.id }, function (err, user) {
                        if (err) {
                            console.log(err);
                        } else if (user) {
                            console.log('found');
                            console.log(user);
                            var cart = user.cart;
                            if (cart.length !== 0) {
                                var i;
                                for (i = 0; i < cart.length; i++) {
                                    if ((cart[i].path === product.path) && (cart[i].color === product.color) && (cart[i].size === product.size)) {
                                        break;
                                    }
                                }
                                if (i === cart.length) {
                                    cart.push(product);
                                } else {
                                    cart[i].quantity += product.quantity;
                                }
                            } else {
                                cart.push(product);
                            }
                            var cartTotal = req.user.cartTotal + (product.price * product.quantity);
                            User.updateOne({ _id: req.user.id }, { cart: cart, cartTotal: cartTotal }, function (err, done) {
                                if (err) {
                                    console.log('Somthing went wrong!');
                                    console.log(err);
                                } else {
                                    console.log('Item added successfully!');
                                    res.json({ done: true });
                                    res.end();
                                }
                            });
                        }
                    });
                } else {
                    res.json({ done: false });
                    res.end();
                }

            } else {
                console.log('notfound');
            }
        });
    } catch (err) {
        console.log(err);
        res.json({ done: false });
        res.end();
    }
});

/*..................*/

/*adding to user cart.............*/




/*adding to user cart.............*/

/*..........Login form............*/



/*..........Register fomt..........*/

/*........user cart..........*/

app.get("/cart", function (req, res) {
    if (req.isAuthenticated()) {
        res.render('cart', {
            cart: req.user.cart,
            total: req.user.cartTotal,
            fname: req.user.firstname,
            lname: req.user.lastname,
            pnumber: req.user.phoneNumber,
            login: true
        });
    } else {
        res.redirect('/');
    }

});

app.patch("/cart", async function (req, res) {
    console.log(req.body);
    var cart = req.user.cart;
    if (req.body.type == 'delete') {
        try {
            console.log('cart before : ' + req.user.cart);
            var index = cart.findIndex(p => p._id === req.body.productId);
            console.log(index);
            var newCartPrice = req.body.cartTotal - parseInt(cart[index].price) * parseInt(req.body.qty);
            cart.splice(index, 1);
            await User.findByIdAndUpdate({ _id: req.user.id }, { cart: cart, cartTotal: newCartPrice }, function (err, newCart) {
                if (err) {
                    console.log(err);
                    res.json({ done: false });
                    res.end();
                } else {
                    console.log('cart after : ' + newCart);
                    res.json({ cart: req.user.cart, total: newCartPrice, done: true });
                    res.end();
                }
            });
        } catch (err) {
            console.log(err);
            res.json({ done: false });
            res.end();
        }

    } else {
        try {
            for (var i = 0; i < cart.length; i++) {
                cart[i].quantity = req.body.qty[i];
            }
            await User.findByIdAndUpdate({ _id: req.user.id }, { cart: cart, cartTotal: req.body.cartTotal }, function (err, item) {
                if (err) {
                    console.log(err);
                    res.json({ done: false });
                    res.end();
                }
            });
            var now = new Date();
            var order = new Order({
                userID: req.user.id,
                date: dateFormat(now, "mm/dd/yyyy"),
                FNAME: req.body.fname,
                LNAME: req.body.lname,
                PH: req.body.ph,
                city: req.body.city,
                order: req.user.cart,
            });
            await order.save();
            res.json({ done: true });
            res.end();
        } catch (err) {
            console.log(err);
            res.json({ done: false });
            res.end();
        }
    }
});


app.get('/login', function (req, res) {
    res.render('login');
});


app.post('/login', function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });

    req.logIn(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/');
            });
        }
    });
});

/*..........Login form............*/


/*..........Register fomt..........*/

app.get('/register', function (req, res) {
    res.render('register');
});


app.post('/register', function (req, res, next) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log('err');
            console.log(err);
            res.redirect('/register');
        } else {
            console.log('yesy');
            passport.authenticate('local')(req, res, function () {
                res.redirect('/');
            });
        }
    });

});
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000");
});