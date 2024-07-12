// $ npm i @vechain/connex
// $ npm i @vechain/connex-framework
// $ npm i @vechain/connex-driver
// $ npm i express

const { Framework } = require("@vechain/connex-framework");
const { Driver, SimpleNet, SimpleWallet } = require('@vechain/connex-driver')
const contractAbi = require("./abi.json");

require('dotenv').config();

// vechain paramenters
const privateKey = process.env.VECHAIN_KEY;
const network = 'https://sync-testnet.vechain.org';
const contractAddress = '0x1A59DDAE8B2F914091d1664CE30f59A9Bb958bBF';
const getMetrics = contractAbi.find(({ name }) => name === "getMetrics");
const getMetric = contractAbi.find(({ name }) => name === "getMetric");
const deviceId = "0x6465766963652d31000000000000000000000000000000000000000000000000";


// Express variables
const express = require('express');
const app = express();
const port = 8080;


// Route to get metrics
app.get('/metrics', async (req, res) => {
    try {
      const startTimestamp = req.query.start ? new Date(req.query.start).getTime() : 0;
      const endTimestamp = req.query.end ? new Date(req.query.end).getTime() : Date.now();
      const jsonData = await getDeviceMetrics(startTimestamp, endTimestamp);
      res.json(jsonData);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


async function getDeviceMetric() {
    const wallet = new SimpleWallet();
    // add account by importing private key
    wallet.import(privateKey);
  
    const net = new SimpleNet(network);
    const driver = await Driver.connect(net, wallet);
  
    const connex = new Framework(driver);
  
    const metrics = await connex.thor
    .account(contractAddress)
    .method(getMetric)
    .call(deviceId, 0);
  
    var date = new Date(parseInt(metrics.decoded[0]))
  
    console.log(`Date: ${date}`)
    console.log('Temperature: ' + metrics.decoded[1]);
    console.log('Humidity: ' + metrics.decoded[2]);
    console.log('Pressure: ' + metrics.decoded[3]);
  };


async function getDeviceMetrics(startTimestamp, endTimestamp) {
    const wallet = new SimpleWallet();
    wallet.import(privateKey);
    const net = new SimpleNet(network);
    const driver = await Driver.connect(net, wallet);
    const connex = new Framework(driver);
  
    const metrics = await connex.thor
    .account(contractAddress)
    .method(getMetrics)
    .call(deviceId);

    const metricsString = JSON.stringify(metrics.decoded[0]);

    return new Promise((resolve) => {
          const metricsArray = JSON.parse(metricsString);
          const keys = ["timestamp", "temperature", "humidity", "Pressure"];
          const metricsJsonObjectArray = metricsArray.map(item => {
            let obj = {};
            // Convert the timestamp to a readable date format
            const itemTimestamp = parseInt(item[0],10);
            const readableTimestamp = new Date(itemTimestamp).toISOString();

            obj[keys[0]] = readableTimestamp;
            for (let i = 1; i < keys.length; i++) {
                obj[keys[i]] = item[i];
              }
            return obj;
          });


          // Filter the data based on the timestamp range
          const filteredData = metricsJsonObjectArray.filter(item => {
            const itemTimestamp = new Date(item.timestamp).getTime();
            const inRange = itemTimestamp >= startTimestamp && itemTimestamp <= endTimestamp;
            return inRange;
          });
          resolve(filteredData);

    });


};

//getDeviceMetrics();

