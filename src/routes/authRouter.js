const express = require('express');
const router = express.Router();
const { signIn, signUp, signOut } = require('../controller/authController');

router.post('/signin', signIn);
router.post('/signup', signUp);
// router.post('/signout', signOut);

module.exports = router;