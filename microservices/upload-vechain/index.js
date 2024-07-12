//$ npm i @vechain/connex
//$ npm i @vechain/connex-framework
//$ npm i @vechain/connex-driver
//$ npm i @azure/service-bus
//$ npm i stringify-object
const { Framework } = require("@vechain/connex-framework");
const { Driver, SimpleNet, SimpleWallet } = require('@vechain/connex-driver')
const contractAbi = require("./abi.json");
const { delay, ServiceBusClient, ServiceBusMessage } = require("@azure/service-bus");

require('dotenv').config();

// Azure Service Bus Topic Parameters
const connectionString = process.env.SERVICEBUS_CONNECTION_STRING;
const topicName = "tfm-bus-topic";
const subscriptionName = "subscription-tfm";

// vechain paramenters
const privateKey = process.env.VECHAIN_KEY;
const network = 'https://sync-testnet.vechain.org';
const contractAddress = '0x1A59DDAE8B2F914091d1664CE30f59A9Bb958bBF';
const signerAddress = '0xf332B5f9ADd925725E5399B10AF7a6ad6B5b0Ff3';
const addMetrics = contractAbi.find(({ name }) => name === "addMetrics");
const getMetrics = contractAbi.find(({ name }) => name === "getMetrics");
const getMetric = contractAbi.find(({ name }) => name === "getMetric");
const deviceId = "0x6465766963652d31000000000000000000000000000000000000000000000000";


async function main() {

  // Connect to Azure Service Bus
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(topicName, subscriptionName);

  // Connect to vechain
  const wallet = new SimpleWallet();
  wallet.import(privateKey);
  const net = new SimpleNet(network);
  const driver = await Driver.connect(net, wallet);
  const connex = new Framework(driver);
  const transferMethod = connex.thor.account(contractAddress).method(addMetrics)


  // function to handle messages
  const myMessageHandler = async (messageReceived) => {
      console.log(messageReceived.body);
      // Build vechain message
      const clause = transferMethod.asClause(deviceId,
        new Date(messageReceived.body.date).getTime(),
        parseInt(messageReceived.body.temperature),
        parseInt(messageReceived.body.humidity),
        parseInt(messageReceived.body.pressure)
      );
      
      // Send transaction to vechain
      connex.vendor.sign('tx', [
        {
            ...clause
        }]
        )
        .signer(signerAddress) // Enforce signer
        .gas(200000) // Set maximum gas
        .link('https://connex.vecha.in/{txid}')
        .request()
        .then(result=>{
            console.log(result)
        })
      
  };

  // function to handle any errors
  const myErrorHandler = async (error) => {
      console.log(error);
  };

  // subscribe and specify the message and error handlers
  receiver.subscribe({
      processMessage: myMessageHandler,
      processError: myErrorHandler
  });

  // Waiting long enough before closing the sender to send messages
  //await delay(10000);

  //await receiver.close();
  //await sbClient.close();
}
main().catch((err) => {
  console.log("Error occurred: ", err);
  process.exit(1);
});

