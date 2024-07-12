// $ npm install express axios
// $ npm install thor-devkit
// $ npm i web3-eth-abi
// $ npm install web3
// $ npm install @vechain/connex-framework @vechain/connex-driver
// $ npm install abi-decoder

const express = require('express');
const Web3EthAbi = require('web3-eth-abi')
const web3 = require('web3');
const axios = require('axios');
const abiDecoder = require('abi-decoder');

const { ethers } = require('ethers');



const app = express();
const port = 80;

// Define your ABI
const abi = require("./abi.json");


function bytes32ToString(bytes32) {
  // Remove 0x prefix
  bytes32 = bytes32.replace(/^0x/, '');

  // Convert to ASCII or UTF-8
  const hexToBytes = ethers.utils.arrayify(`0x${bytes32}`);
  const str = ethers.utils.parseBytes32String(hexToBytes);
  
  return str;
}


// CSS for styling the output
const css = `
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f4f4f9;
    }
    h1 {
        color: #333;
    }
    pre {
        background-color: #fff;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        overflow: auto;
    }
    .container {
        max-width: 800px;
        margin: 0 auto;
    }
    .header {
        text-align: center;
    }
`;



app.get('/decode', async (req, res) => {
    const txHash = req.query.txHash;
    if (!txHash) {
      return res.status(400).send('Missing txHash query parameter');
    }
  
    try {
      // Fetch transaction data from VeChain testnet explorer API
      console.log("TX Hash: " + txHash);
      const response = await axios.get(`https://explore-testnet.vechain.org/api/transactions/${txHash}`);
      const transaction = JSON.stringify(response.data);
      var txJson = JSON.parse(transaction);
      var txData = txJson.tx.clauses[0].data;

      console.log("TX: " + transaction);
      console.log("Data: " + txData);
      console.log("ABI Inputs: " + abi[0].inputs);
  
      if (!txData) {
        return res.status(404).send('Transaction not found');
      }
      
      abiDecoder.addABI(abi);
      const decodedData = abiDecoder.decodeMethod(txData);  
      
      filteredData = {
        productId: web3.utils.toAscii(decodedData.params[0].value).replace(/[\u0000-\u001F\u007F-\u009F\u00FA\u00B9\u00D5]/g, '').trim(),
        initialDate: new Date(parseInt(decodedData.params[1].value)).toISOString(),
        endDate: new Date(parseInt(decodedData.params[2].value)).toISOString(),
        maxTemp: decodedData.params[3].value,
        minTemp: decodedData.params[4].value,
        avgTemp: decodedData.params[5].value,
        maxHumidity: decodedData.params[6].value,
        minHumidity: decodedData.params[7].value,
        avgHumidity: decodedData.params[8].value
      };
      

      console.log("Decoded Data: " + JSON.stringify(filteredData));

    res.send(`
        <html>
            <head>
                <style>${css}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Product Information</h1>
                        <h2>Verified by Vechain</h2>
                    </div>
                    <pre>${JSON.stringify(filteredData, null, 2)}</pre>
                </div>
            </body>
        </html>
      `);
    } catch (error) {
      console.error(`Error fetching or decoding transaction data: ${error.message}`);
      res.status(500).send(`Error fetching or decoding transaction data: ${error.message}`);
    }
  });
  
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });