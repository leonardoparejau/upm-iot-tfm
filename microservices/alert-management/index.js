// $ npm install azure-iothub
// $ npm install azure-iot-common
// $ npm install dotenv
// $ npm i @azure/service-bus
'use strict';

var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
const { delay, ServiceBusClient, ServiceBusMessage } = require("@azure/service-bus");

require('dotenv').config();

// Service Bus Variables
const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
const topicName = "tfm-bus-topic";
const subscriptionName = "subscription-alert-management";

// IoT Variables
const deviceConnectionString = process.env.IOTHUB_SERVICE_CONNECTION_STRING;
var targetDevice = "kubuka-metrics";

var serviceClient = Client.fromConnectionString(deviceConnectionString);

// Set Thredshold values
var maxTemp = 28;
var minTemp = 20;


  // Print results on console
  function printResultFor(op) {
    return function printResult(err, res) {
      if (err) console.log(op + ' error: ' + err.toString());
      if (res) console.log(op + ' status: ' + res.constructor.name);
    };
  }

  // Print acknowledge message on console
  function receiveFeedback(err, receiver){
    receiver.on('message', function (msg) {
      console.log('Feedback message:')
      console.log(msg.getData().toString('utf-8'));
    });
  }

async function main() {

  // Connect to Azure Service Bus
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(topicName, subscriptionName);


  // function to handle messages
  const myMessageHandler = async (messageReceived) => {
    console.log(messageReceived.body);

    // logic to trigger alert
    if (messageReceived.body.temperature > maxTemp | messageReceived.body.temperature < minTemp) {
      // Send message to device
      serviceClient.open(function (err) {
        if (err) {
          console.error('Could not connect: ' + err.message);
        } else {
          console.log('Service client connected');
          serviceClient.getFeedbackReceiver(receiveFeedback);
          var message = new Message('LED_ON');
          message.ack = 'full';
          message.messageId = "Alert";
          console.log('Sending message: ' + message.getData());
          serviceClient.send(targetDevice, message, printResultFor('send'));
        }
      });
    } else {
      serviceClient.open(function (err) {
        if (err) {
          console.error('Could not connect: ' + err.message);
        } else {
          console.log('Service client connected');
          serviceClient.getFeedbackReceiver(receiveFeedback);
          var message = new Message('LED_OFF');
          message.ack = 'full';
          message.messageId = "Alert";
          console.log('Sending message: ' + message.getData());
          serviceClient.send(targetDevice, message, printResultFor('send'));
        }
      });
    }
  }

  // function to handle any errors
  const myErrorHandler = async (error) => {
    console.log(error);
  };

  // subscribe and specify the message and error handlers
  receiver.subscribe({
    processMessage: myMessageHandler,
    processError: myErrorHandler
  });
}
main().catch((err) => {
  console.log("Error occurred: ", err);
  process.exit(1);
});
