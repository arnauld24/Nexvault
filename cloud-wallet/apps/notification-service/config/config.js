require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'arnauldfonkoua@gmail.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'yhniitwjjkaaajau',
  EMAIL_FROM: process.env.EMAIL_FROM || 'arnauldfonkoua@gmail.com',

  // SMS (Twilio or similar)
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'twilio', // twilio, aws-sns, vonage
  SMS_ACCOUNT_SID: process.env.SMS_ACCOUNT_SID,
  SMS_AUTH_TOKEN: process.env.SMS_AUTH_TOKEN,
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER,
};
