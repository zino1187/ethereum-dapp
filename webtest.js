/*--------------------------------------------------------------
●web3js 설치 명령어
	ex) npm install web3@^0.20.0

●mining 모듈 설치 명령어
	ex) npm install node-miner
--------------------------------------------------------------*/
var Web3 = require('web3');
const nodeMiner = require('node-miner');

var web3 = new Web3(new Web3.providers.HttpProvider('http://172.30.1.4:8545'));

//잔고 구하기
var balance=web3.eth.getBalance(web3.eth.accounts[1]);
//console.log(balance);

var mining=web3.eth.mining;
console.log(mining);

if(!mining){
	console.log("채굴을 시작시키겠습니다");
}

