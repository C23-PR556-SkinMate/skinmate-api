const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../firebase');
const db = app.firestore();
require('dotenv').config();

const {
    validateEmail,
    validateDate,
    validateSkinType,
    validateGender,
} = require('../helper/formatValidationHelper');

const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

const encryptPassword = async (password) => {
    return bcrypt.hash(password, 10);
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(404).json({
            message: 'Missing email or password',
        });
    }

    if (!validateEmail(email)) {
        return res.status(409).json({
            message: 'Invalid email format',
        });
    }

    try {
        const userRef = db.collection('users');
        const userSnapshot = await userRef.where('email', '==', email).limit(1).get();
        
        if (userSnapshot.empty) {
            return res.status(404).json({
                message: 'Email does not exists',
            });
        }
        
        const uid = userSnapshot.docs[0].id;
        const hashedPassword = userSnapshot.docs[0].data().password;

        if (await comparePassword(password, hashedPassword)) {
            const token = jwt.sign({uid, email}, process.env.ACCESS_TOKEN_SECRET);
            res.status(200).json({
                data : {
                    uid,
                    token,
                },
                message: 'Logged in successfully',
                success: true,
            });
        } else {
            res.status(404).json({
                message: 'Wrong password',
            });
        }
    } catch (error) {
        next(error);
    }
};

const register = async (req, res, next) => {
    const {
        email,
        password,
        displayName,
        dateOfBirth,
        skinType,
        gender,
    } = req.body;

    if (!email || !password) {
        return res.status(404).json({
            message: 'Missing email or password',
        });
    }

    if (!validateEmail(email)) {
        return res.status(409).json({
            message: 'Invalid email format',
        });
    }

    if (!validateDate(dateOfBirth)) {
        return res.status(404).json({
            message: 'Error, invalid date format',
        });
    }

    if (!validateSkinType(skinType)) {
        return res.status(404).json({
            message: 'Error, skin type does not exist',
        });
    }
    
    if (!validateGender(gender)) {
        return res.status(404).json({
            message: 'Error, gender type does not exist',
        });
    }

    try {
        const userRef = db.collection('users');
        const checkEmails = await userRef.where('email', '==', email).get();

        if (!checkEmails.empty) {
            return res.status(409).json({
                message: 'Email already exists',
            });
        }

        const hashedPassword = await encryptPassword(password);
        const createdAt = Date.now();
        const newUserRef = userRef.doc();
        
        await newUserRef.set({
            email,
            password: hashedPassword,
            verified: false,
            createdAt,
            updatedAt : createdAt,
        });
        
        const profileRef = db.collection('profiles');
        const uid = newUserRef.id;

        await profileRef.doc(uid).set({
            displayName: displayName || email.split('@')[0],
            dateOfBirth: dateOfBirth || '',
            skinType: skinType || '',
            gender: gender || '',
            createdAt,
            updatedAt : createdAt,
        });
        
        res.status(200).json({
            message: 'Registered successfully',
            success: true,
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    register,
};