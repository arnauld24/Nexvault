require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'FONK2005-',
  DB_HOST: process.env.DB_HOST || 'psotgres',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'nexvault_db',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fbd204a7-318e-4dd3-86e0-e6d524fc3f98',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'fbd204a7-318e-4dd3-86e0-e6d524fc3f98',

  // Session
  SESSION_EXPIRY_HOURS: parseInt(process.env.SESSION_EXPIRY_HOURS) || 24,
  SESSION_ABSOLUTE_TIMEOUT_DAYS: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_DAYS) || 30,

  // RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'arnauldfonkoua@gmail.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'yhniitwjjkaaajau',
  EMAIL_FROM: process.env.EMAIL_FROM || 'arnauldfonkoua@gmail.com',


  // Rate Limiting
  LOGIN_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 5,
  REGISTER_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  REGISTER_RATE_LIMIT_MAX_ATTEMPTS: 3,

  // Security
  BCRYPT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour

  // API Gateway (for wallet service communication)
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
};
