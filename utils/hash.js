const bcrypt = require('bcryptjs');


try {
    const password = 'Welcome@123'; // The password you want to use
    bcrypt.hash(password, 10, (err, hash) => {
        console.log("Your Hashed Password is:", hash);
    });
} catch (error) {
    console.log(error)
}