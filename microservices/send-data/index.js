const fs = require('fs');
const contractAbi = require("./abi.json");
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

require('dotenv').config();


/////////////////////////////// Azure MQTT /////////////////////////////////////////////////

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;
const device_id = "device-1";
console.log(deviceConnectionString);
let sendInterval;


/// BULK LOAD ////
const filePath = './data.txt';
let lines = [];
let currentIndex = 0;


function parseData(data) {
  const lines = data.split('\n');
  return lines.filter(line => line.startsWith('Data:')).map(line => {
    const match = line.match(/Temp: (\d+\.\d+), Hum: (\d+\.\d+), Pres: (\d+\.\d+)/);
    if (match) {
      return {
        temperature: parseFloat(match[1]),
        humidity: parseFloat(match[2]),
        pressure: parseFloat(match[3])
      };
    }
    return null;
  }).filter(entry => entry !== null);
}

function sendNextLine() {
  if (currentIndex >= lines.length) {
    clearInterval(sendInterval);
    sendInterval = null;
    console.log('All lines have been sent.');
    return;
  }

  const messageData = lines[currentIndex];
  const message = new Message(JSON.stringify({
    deviceId: device_id,
    date: Date.now(),
    temperature: messageData.temperature,
    humidity: messageData.humidity,
    pressure: messageData.pressure
  }));
  message.properties.add("level", "storage");

  console.log('Sending message:', message.getData());
  client.sendEvent(message, printResultFor('send'));

  currentIndex++;
}


function readFileAndSendMessages() {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    lines = parseData(data);
    currentIndex = 0;

    if (!sendInterval) {
      sendInterval = setInterval(sendNextLine, 20000); // Send next line every 20 seconds
    }
  });
}

// The AMQP and HTTP transports have the notion of completing, rejecting or abandoning the message.
// For example, this is only functional in AMQP and HTTP:
// client.complete(msg, printResultFor('completed'));
// If using MQTT calls to complete, reject, or abandon are no-ops.
// When completing a message, the service that sent the C2D message is notified that the message has been processed.
// When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
// When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
// MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
function messageHandler(msg) {
  console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
  client.complete(msg, printResultFor('completed'));
}

function generateMessage() {
  const date = Date.now(); // current date
  const temperature = 15 + (Math.random() * 15); // range: [15, 30]
  const humidity = 30 + (Math.random() * 50); // range: [30, 80]
  const pressure = 950 + (Math.random() * 1050); // range: [950, 1050]
  const data = JSON.stringify({ deviceId: device_id, date: date, temperature: temperature, humidity: humidity, pressure: pressure});
  const message = new Message(data);
  message.properties.add("level", "storage");
  
  return message;
}

function errorHandler(err) {
  console.error(err.message);
}

function disconnectHandler() {
  clearInterval(sendInterval);
  sendInterval = null;
  client.open().catch((err) => {
    console.error(err.message);
  });
}

function connectHandler() {
  console.log('Client connected');
  // Create a message and send it to the IoT Hub every two seconds
  if (!sendInterval) {
    /*
    sendInterval = setInterval(() => {
      const message = generateMessage();
      console.log('Sending message: ' + message.getData());
      client.sendEvent(message, printResultFor('send'));
    }, 10000);
    */
    // Bulk load
    readFileAndSendMessages(); // Read file and send messages every 10 seconds
  }
}

// fromConnectionString must specify a transport constructor, coming from any transport package.
let client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.on('connect', connectHandler);
client.on('error', errorHandler);
client.on('disconnect', disconnectHandler);
client.on('message', messageHandler);

client.open()
.catch((err) => {
  console.error('Could not connect: ' + err.message);
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}



