const evt = document.getElementById('evt_list');
const cin = document.getElementById('contract');
const pin = document.getElementById('payment');

const ast = '2px solid #c0392b';
const dst = '2px solid #000000';

const xhr = new XMLHttpRequest();

window.onload = init();

var data = undefined;
var data2 = undefined;

/*
 * This function makes an ajax call to the url '/init' to get the values for:
 * the dealer account balance, the buyer account balance, the buyer address,
 * and the vehicle cost.
 * 
 * On success, the appropriate dom elements on the page are updated
 */
function init() {
    cin.addEventListener('click' , contract);
    pin.addEventListener('click' , payment);
    toggle(false); // Enable dealer button
    xhr.open('GET', '/init', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // log(xhr.responseText);

                data = JSON.parse(xhr.responseText);

                document.getElementById('dbal').innerText = data.dealer_balance;
                document.getElementById('baddr').value = data.buyer;
                document.getElementById('vcost').value = data.cost;
                document.getElementById('vamt').value = data.cost;
                document.getElementById('bbal').innerText = data.buyer_balance;

                log('UI: Application successfully initialied');
            } else {
                log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send();
}

/*
 * This function will ensure that only one button is active at any point in
 * time - either the button to deploy a contract on the dealer column or the
 * payment button on the buyer column once the contract has been deployed.
 */
function toggle(state) {
    cin.disabled = state;
    cin.style.border = (state ? dst : ast);
    cin.style.opacity = (state ? 0.5 : 1);
    pin.disabled = !state;
    pin.style.border = (!state ? dst : ast);
    pin.style.opacity = (!state ? 0.5 : 1);
}

/*
 * This function logs messages on the bottom part of the screen in the Event
 * Messages box.
 */
function log(msg) {
    let dt = new Date();
    let pnode = document.createElement('p');
    pnode.textContent = '[' + dt.toString() + '] ' + msg;
    evt.appendChild(pnode);
}

/*
 * This function makes an ajax call to the url '/contract' to deploy the
 * Vehicle2 contract. If the contract is successfully deployed, the server
 * returns the deployed contract address.
 * 
 * On sucess, the appropriate dom element on the page is updated
 */
function contract() {
    xhr.open('POST', '/contract', true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // log(xhr.responseText);

                data2 = JSON.parse(xhr.responseText);

                document.getElementById('caddr').value = data2.contract_address;

                toggle(true); // Enable buyer button

                log('UI: Contract successfully deployed');
            } else {
                log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send(JSON.stringify(data));
}

/*
 * This function makes an ajax call to the url '/payment' to invoke the
 * deployed Vehicle2 contract method buyVehicle. On successful invocation,
 * the server returns the current dealer account balance, the current
 * buyer account balance, and a list of events that have been emitted
 * by the deployed contract.
 * 
 * On sucess, the appropriate dom elements in the page are updated
 */
function payment() {
    xhr.open('POST', '/payment', true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // log(xhr.responseText);

                let data3 = JSON.parse(xhr.responseText);

                document.getElementById('dbal').innerText = data3.dealer_balance;
                document.getElementById('bbal').innerText = data3.buyer_balance;
                document.getElementById('caddr').value = '';

                data3.events.forEach(event => {
                    log(`NODE: Event ${JSON.stringify(event)}`);
                });

                toggle(false); // Enable dealer button

                log('UI: Payment successfully executed');
            } else {
                log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send(JSON.stringify(data2));
}