//$ npm i @vechain/connex
//$ npm i @vechain/connex-framework
//$ npm i @vechain/connex-driver
//$ npm i axios

const { Framework } = require("@vechain/connex-framework");
const { Driver, SimpleNet, SimpleWallet } = require('@vechain/connex-driver')
const contractAbi = require("./abi.json");
const axios = require('axios');

require('dotenv').config();

// vechain paramenters
const privateKey = process.env.VECHAIN_KEY;
const network = 'https://sync-testnet.vechain.org';
const contractAddress = '0xabc9babd876940cab864a7f398f2785695e6008f';
const signerAddress = '0xf332B5f9ADd925725E5399B10AF7a6ad6B5b0Ff3';
const addSummary = contractAbi.find(({ name }) => name === "addSummary");
const productId = "0x70726f647563742d310000000000000000000000000000000000000000000000";




async function getMetricsData(start, end) {
  const url = `http://metrics-api.tfm.svc.cluster.local:8080/metrics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

function processMetricsData(data) {
    let firstRecordDate = null;
    let lastRecordDate = null;
    let maxTemperature = -Infinity;
    let minTemperature = Infinity;
    let totalTemperature = 0;
    let maxHumidity = -Infinity;
    let minHumidity = Infinity;
    let totalHumidity = 0;
    let recordCount = 0;

    data.forEach(record => {
        const recordDate = new Date(record['timestamp']);
        const temperature = parseFloat(record['temperature']);
        const humidity = parseFloat(record['humidity']);

        if (!firstRecordDate || recordDate < firstRecordDate) {
            firstRecordDate = recordDate;
        }

        if (!lastRecordDate || recordDate > lastRecordDate) {
            lastRecordDate = recordDate;
        }

        if (temperature > maxTemperature) {
            maxTemperature = temperature;
        }

        if (temperature < minTemperature) {
            minTemperature = temperature;
        }

        if (humidity > maxHumidity) {
            maxHumidity = humidity;
        }

        if (humidity < minHumidity) {
            minHumidity = humidity;
        }

        totalTemperature += temperature;
        totalHumidity += humidity;
        recordCount++;
    });

    const avgTemperature = totalTemperature / recordCount;
    const avgHumidity = totalHumidity / recordCount;

    return {
        firstRecordDate: new Date(firstRecordDate).getTime(),
        lastRecordDate: new Date(lastRecordDate).getTime(),
        maxTemperature,
        minTemperature,
        avgTemperature: avgTemperature.toFixed(2),
        maxHumidity,
        minHumidity,
        avgHumidity: avgHumidity.toFixed(2)
    };
}

async function main() {
  const start = '2024-07-10T00:00:00.000Z';
  const end = '2024-07-11T00:00:00.000Z';

  // Connect to vechain
  const wallet = new SimpleWallet();
  wallet.import(privateKey);
  const net = new SimpleNet(network);
  const driver = await Driver.connect(net, wallet);
  const connex = new Framework(driver);
  const transferMethod = connex.thor.account(contractAddress).method(addSummary)
  
  try {
    const data = await getMetricsData(start, end);
    const processedData = processMetricsData(data);
    console.log('Metrics Data:');
    console.log(`First Record Date: ${processedData.firstRecordDate}`);
    console.log(`Last Record Date: ${processedData.lastRecordDate}`);
    console.log(`Max Temperature: ${processedData.maxTemperature}`);
    console.log(`Min Temperature: ${processedData.minTemperature}`);
    console.log(`Average Temperature: ${processedData.avgTemperature}`);
    console.log(`Max Humidity: ${processedData.maxHumidity}`);
    console.log(`Min Humidity: ${processedData.minHumidity}`);
    console.log(`Average Humidity: ${processedData.avgHumidity}`);

    // Build vechain message
    const clause = transferMethod.asClause(productId,
      processedData.firstRecordDate,
      processedData.lastRecordDate,
      parseInt(processedData.maxTemperature),
      parseInt(processedData.minTemperature),
      parseInt(processedData.avgTemperature),
      parseInt(processedData.maxHumidity),
      parseInt(processedData.minHumidity),
      parseInt(processedData.avgHumidity)
    );

    // Send transaction to vechain
    connex.vendor.sign('tx', [
      {
          ...clause
      }]
      )
      .signer(signerAddress) // Enforce signer
      .gas(300000) // Set maximum gas
      .link('https://connex.vecha.in/{txid}')
      .request()
      .then(result=>{
          console.log(result)
      })

  } catch (error) {
    console.error('Failed to process metrics:', error);
  }

}

main();
