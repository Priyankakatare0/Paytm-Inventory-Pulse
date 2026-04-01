require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const jwtMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(401).json({message: "No token provided" });
    }

    try{
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch(err) {
        return res.status(401).json({message: "Invalid or expired token"});
    }
};

const generateToken = (userData) => {
    return jwt.sign(userData, JWT_SECRET, {expiresIn: '8h'});
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {jwtMiddleware, generateToken, verifyToken, JWT_SECRET};
