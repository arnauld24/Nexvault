require('dotenv').config();
const amqp = require('amqplib');

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
    
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      setTimeout(() => {
        connectRabbitMQ();
      }, 5000);
    });

    channel = await connection.createChannel();
    
    // Assert exchanges
    await channel.assertExchange('nexvault.notifications', 'direct', { durable: true });
    await channel.assertExchange('nexvault.events', 'topic', { durable: true });

    // Assert queues
    await channel.assertQueue('notifications.email', { durable: true });
    await channel.assertQueue('notifications.sms', { durable: true });
    await channel.assertQueue('events.user-registered', { durable: true });
    await channel.assertQueue('events.user-login', { durable: true });

    // Bind queues to exchanges
    await channel.bindQueue('notifications.email', 'nexvault.notifications', 'email');
    await channel.bindQueue('notifications.sms', 'nexvault.notifications', 'sms');
    await channel.bindQueue('events.user-registered', 'nexvault.events', 'user.registered');
    await channel.bindQueue('events.user-login', 'nexvault.events', 'user.login');

    console.log('✓ RabbitMQ connected successfully');
    return channel;
  } catch (error) {
    console.error('✗ RabbitMQ connection failed:', error.message);
    setTimeout(() => {
      connectRabbitMQ();
    }, 5000);
  }
};

const publishEvent = async (exchange, routingKey, message) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not available');
      return false;
    }
    
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    return true;
  } catch (error) {
    console.error('Error publishing event:', error);
    return false;
  }
};

const consumeMessage = async (queue, callback) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not available');
      return;
    }

    await channel.consume(queue, (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          callback(content);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error('Error consuming message:', error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishEvent,
  consumeMessage,
};
