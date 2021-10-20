const express = require('express');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authconfig = require('../../config/auth.json');
const crypto = require('crypto');
const router = express.Router();
const mailer = require('mailer');

function generateToken(params = {}) {
    const token = jwt.sign(params, authconfig.secret, {
        expiresIn: 86400,
    });
    return token;
}

router.post('/register', async (req, res) => {
    const { email } = req.body;
    try {
        if (await User.findOne({ email })) {
            return res.status(400).send({ Error: "User Already Exists!!!" });
        }
        const user = await User.create(req.body);
        user.email = undefined;
        user.password = undefined;
        return res.send({
            user, token: generateToken({ id: user.id }),
        });
    } catch (err) {
        res.status(400).send({ Error: 'Registration failed' })
    }
});

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return res.status(400).send({ Error: "User not found!!!" });
    }

    if (!await bcrypt.compare(password, user.password)) {
        return res.status(400).send({ Error: "Invalid password!" });
    }
    user.password = undefined;
    res.send({ user, token: generateToken({ id: user.id }) });

});

router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ Error: "User not found" });
        }
        const token = crypto.randomBytes(20).toString('hex');
        const now = new Date();
        now.setHours(now.getHours() + 1);
        await User.findByIdAndUpdate(user.id, {
            '$set': {
                'passwordResetToken': token,
                'passwordExpiresToken': now
            }
        });
        console.log(token, now);
    } catch (err) {
        return res.status(400).send({ Error: "Wrong password, try again" });
    }
})
module.exports = app => app.use('/auth', router);
