/**
 * @file testEnv.js
 * @author TheWatcher01
 * @date 10-10-2024
 * @description This file is used to test the environment variables.
 */

require("dotenv").config();

console.log("Testing dotenv loading:");
console.log("CLIENT_ID:", process.env.CLIENT_ID);
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET);
console.log("CALLBACK_URL:", process.env.CALLBACK_URL);

