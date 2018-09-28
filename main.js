var fs = require('fs');
var express = require('express');
var bodyparser = require('body-parser');
var Web3 = require('web3');
var solc = require('solc');
var util = require('util');

let vin = '1234567890';
let cost = 1000000000000000000;
let gas = 1000000;
let abi = undefined;
let bin = undefined;
let web3 = undefined;

/*
 * This function prepares the server by compiling the Vehicle2 solidity contract
 * source code using the solc npm module. On successful compile, extracts the
 * ABI definition and the bytecode. In addition, initializes a web3 connection
 * to the private ethereum network.
 */
function setUp() {
    let source = fs.readFileSync('./content/car_contract.sol', 'UTF-8');
    let compiled = solc.compile(source);

    bin = compiled.contracts[':Vehicle2'].bytecode;

    util.log(">>>>> setup - Bytecode: ${bin}");
    util.log(">>>>> setup - ABI: ${compiled.contracts[':Vehicle2'].interface}");
    
    abi = JSON.parse(compiled.contracts[':Vehicle2'].interface);

    web3 = new Web3(new Web3.providers.HttpProvider('http://172.30.1.4:8545'));

    util.log(">>>>> setup - Completed !!!")
}

/*
 * This function handles the ajax call to the url '/init'. It uses the web3
 * connection to fetch all the 4 accounts in our private ethereum network
 * and selects the buyer (2nd) and dealer (3rd) account addresses. Next,
 * makes a call to fetch the balances for the buyer and dealer accounts.
 * 
 * Returns the results in the json format:
 * 
 * {
 *     vin: <vin number>,
 *     cost: <vehicle cost>,
 *     buyer: <buyer account address>
 *     dealer: <dealer account address>
 *     buyer_balance: <buyer account balance in ethers>,
 *     dealer_balance: <dealer account balance in ethers>
 * }
 */
function initApi(response) {
    let data = {
        vin: vin,
        cost: 1,
        buyer: undefined,
        dealer: undefined,
        buyer_balance: undefined,
        dealer_balance: undefined
    };

    web3.eth.getAccounts()
    .then(accounts => {
        util.log(`>>>>> initApi - Accounts: ${accounts}`);

        data.buyer = accounts[1];
        data.dealer = accounts[2];

        util.log(`>>>>> initApi - Buyer address: ${data.buyer}`);

        return web3.eth.getBalance(data.buyer);
    })
    .then(balance1 => {
        util.log(`>>>>> initApi - Buyer balance: ${web3.utils.fromWei(balance1, 'ether')}`);

        data.buyer_balance = balance1;

        return web3.eth.getBalance(data.dealer);
    })
    .then(balance2 => {
        util.log(`>>>>> initApi - Dealer balance: ${web3.utils.fromWei(balance2, 'ether')}`);

        data.dealer_balance = balance2;

        response.json(data);
    });
}

/*
 * This function handles the ajax call to the url '/contract'. Since the dealer
 * is responsible for deploying the contract, uses the web3 connection to unlock
 * the dealer account and then deploys the contract code to the private Ethereum
 * network. Once the contract is mined and deployed, extracts the deployed contract
 * address.
 * 
 * Returns the results in the json format:
 * 
 * {
 *     vin: <vin number>,
 *     cost: <vehicle cost>,
 *     buyer: <buyer account address>
 *     dealer: <dealer account address>
 *     contract_address: <address of the deployed contract>
 * }
 */
function contractApi(request, response) {
    let contract = new web3.eth.Contract(abi);

    let data = {
        vin: request.body.vin,
        cost: request.body.cost,
        buyer: request.body.buyer,
        dealer: request.body.dealer,
        contract_address: undefined
    };

    util.log(`>>>>> contractApi - Unlocking ${request.body.dealer} account`);

    web3.eth.personal.unlockAccount(request.body.dealer, 'dealer')
    .then(result => {
        util.log(`>>>>> contractApi - Is dealer account unlocked ? ${result}`);
        util.log('>>>>> contractApi - Ready to deploy Vehicle2 contract');

        contract.deploy({
            data: '0x'+bin,
            arguments: [request.body.vin, cost, request.body.buyer]
        })
        .send({
            from: request.body.dealer,
            gas: gas
        })
        .on('receipt', receipt => {
            util.log(`>>>>> contractApi - Contract sucessfully deployed @ address: ${receipt.contractAddress}`);

            data.contract_address = receipt.contractAddress;

            response.json(data);
        });
    }, error => {
        util.log(`***** contractApi - Dealer account unlock error - ${error}`);
    });
}

/*
 * This function handles the ajax call to the url '/payment'. Since the buyer is
 * the entity invoking the contract, uses the web3 connection to unlock the buyer
 * account and then invoke the buyVehicle method on the depoloyed contract. Once
 * the contract method is mined and executed, extracts the balances for the buyer
 * and dealer accounts as well as the emitted events.
 * 
 * Returns the results in the json format:
 * 
 * {
 *     events: <array of emitted events>,
 *     buyer_balance: <buyer account balance in ethers>,
 *     dealer_balance: <dealer account balance in ethers>
 * }
 */
function paymentApi(request, response) {
    let contract = new web3.eth.Contract(abi);

    util.log(`>>>>> paymentApi - Contract address: ${request.body.contract_address}`);

    contract.options.address = request.body.contract_address;    

    util.log(`>>>>> paymentApi - Unlocking ${request.body.buyer} account`);

    web3.eth.personal.unlockAccount(request.body.buyer, 'buyer')
    .then(result => {
        util.log(`>>>>> paymentApi - Is buyer account unlocked ? ${result}`);
        util.log('>>>>> paymentApi - Ready to invoke buyVehicle() method');

        contract.methods.buyVehicle()
        .send({
            from: request.body.buyer,
            value: cost,
            gas: gas
        })
        .on('receipt', receipt => {
            util.log(`>>>>> paymentApi - Contract method buyVehicle() successfully invoked: ${receipt}`);
    
            let data = { 
                events: [], 
                buyer_balance: 0, 
                dealer_balance: 0 
            };

            contract.getPastEvents('Bought', {
                fromBlock: 0,
                toBlock: 'latest'
            })
            .then(events => {
                events.forEach(event => {
                    data.events.push(event.returnValues);
                });
                
                util.log(`>>>>> paymentApi - List of events - ${JSON.stringify(data.events)}`);
    
                return web3.eth.getBalance(request.body.buyer);
            })
            .then(balance1 => {
                util.log(`>>>>> paymentApi - Buyer balance: ${web3.utils.fromWei(balance1, 'ether')}`);
    
                data.buyer_balance = web3.utils.fromWei(balance1, 'ether');
    
                return web3.eth.getBalance(request.body.dealer);
            })
            .then(balance2 => {
                util.log(`>>>>> paymentApi - Dealer balance: ${web3.utils.fromWei(balance2, 'ether')}`);

                data.dealer_balance = web3.utils.fromWei(balance2, 'ether');

                response.json(data);
            })
        })
    }, error => {
        util.log(`***** paymentApi - Buyer unlock error - ${error}`);
    });
}

/*
 * ----- Start of The main server code -----
 */

setUp();

var app = express();

app.use(bodyparser.json());

app.use(function(req, res, next) {
    util.log(`Request => url: ${req.url}, method: ${req.method}`);
    next();
});

app.use(express.static('./content'));

app.get('/init', function(req, res) {
    initApi(res);
});

app.post('/contract', function(req, res) {
    contractApi(req, res);
});

app.post('/payment', function(req, res) {
    paymentApi(req, res);
});

app.listen(9999);

util.log('-> Express server @localhost:9999');