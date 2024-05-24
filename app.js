// Filename - App.js

const express = require("express"),
	mongoose = require("mongoose"),
	passport = require("passport"),
	bodyParser = require("body-parser"),
	LocalStrategy = require("passport-local"),
	passportLocalMongoose = 
		require("passport-local-mongoose")
const User = require("./model/user");
const Transaction = require("./model/Transaction"); 
const Goal=require("./model/Goal");
let app = express();
app.use(express.static('views'));
app.use('/images',express.static('images'));

mongoose.connect("mongodb://localhost/27017");
app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require("express-session")({
	secret: "Rusty is a dog",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
	res.render("home");
});

// Showing secret page
app.get("/secret", isLoggedIn, async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
       
        const transactions = await Transaction.find({ user: req.user._id });
        const salaryTransactions = transactions.filter(transaction => transaction.type === 'salary');
        const totalSalary = salaryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
       
        const expenseTransactions = transactions.filter(transaction => transaction.type === 'expense');
        const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

        const investmentTransactions = transactions.filter(transaction => transaction.type === 'investment');
        const totalInvestments = investmentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

        const savings = totalSalary - totalExpenses - totalInvestments;

        const goals = await Goal.find({ user: req.user._id, completed: false })
                         .sort({ chooseDate: 1 });
        const firstGoalAmount = goals.length > 0 ? goals[0].goalAmount : 0;
       
        res.render("secret", { 
            username: req.user.username,
            totalSalary: totalSalary,
            totalExpenses: totalExpenses,
            totalInvestments: totalInvestments,
            savings: savings,
            goals:goals,
            firstGoalAmount: firstGoalAmount 
        });
    } catch (error) {
        console.error("Error fetching transaction data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



// Showing register form
app.get("/register", function (req, res) {
	res.render("register");
});


// Handling user signup
app.post("/register", async (req, res) => {
    const { email, username, password, confirmpassword } = req.body;


    if (!email || !username || !password || !confirmpassword) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (password !== confirmpassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    try {
    
        const user = await User.create({ email, username, password });

		res.redirect("/login");
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

//Showing login form
app.get("/login", function (req, res) {
    res.render("login", { errorMessage: "" }); 
});


//Handling user login
app.post("/login", async function(req, res) {
    const { username, email, password } = req.body;
    try {
        const userByEmail = await User.findOne({ email: email });
        if (!userByEmail) {
            return res.render("login", { errorMessage: "User does not exist" });
        }
        if (userByEmail.username !== username) {
            return res.render("login", { errorMessage: "Incorrect username" });
        }


        const storedPassword = String(userByEmail.password);
        // Convert the provided password to a string for comparison
        const providedPassword = String(password);
        if (storedPassword !== providedPassword) {
            return res.render("login", { errorMessage: "Incorrect password" });
        } else {
            req.login(userByEmail, function(err) {
                if (err) {
                    return res.render("login", { errorMessage: "Error logging in" });
                }
                return res.redirect("/secret");
            });
        }
    } catch (error) {
         console.error("Error during login:", error);
        res.redirect("/login");
    }
});
//Handling user logout 
app.get("/logout", function (req, res) {
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
});


// Add transaction route
app.post("/transaction", isLoggedIn, async (req, res) => {
    try {
        const { amount, date, creditDebit, type, description } = req.body;
        const transaction = await Transaction.create({
            amount,
            date,
			creditDebit,
            type,
            description,
            user: req.user._id 
        });
        res.redirect("/secret");
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Server-side route to fetch transaction history data
app.get("/transactions", async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id }); 
        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transaction data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.post("/goal", isLoggedIn, async (req, res) => {
    try {
        const { goalName, goalAmount, chooseDate } = req.body;

        const goal = await Goal.create({
            goalName: goalName,
            goalAmount: goalAmount,
            chooseDate: chooseDate,
            completed:false,
            user: req.user._id 
           });
        res.redirect("/secret");
    } catch (error) {
        console.error("Error creating gosl:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


// Add a route to fetch goals
app.get("/goals", isLoggedIn, async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user._id }); 
        res.json(goals);
    } catch (error) {
        console.error("Error fetching goals:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) return next();
	res.redirect("/login");
}

// Showing home page
app.get("/home", function (req, res) {
    res.render("home");
});

//Handling user logout 
app.get("/logout", function (req, res) {
    req.logout(); 
    res.redirect('/home'); 
});

let port = process.env.PORT || 3000;
app.listen(port, function () {
	console.log("Server Has Started!");
});
