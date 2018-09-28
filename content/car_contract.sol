pragma solidity ^0.4.15;

/*
 * This AmountOwed contract implements a common function modifier to check the value of tranfer
 * satisfies the amount owed to dealer
 */

contract AmountOwed {
    // Modifiers can be used to change the behaviour of any function in a contract, such as checking
    // a condition prior to executing the function. Modifiers are inheritable properties of contracts
    // and may be overridden by derived contracts
    modifier validate(uint amt) {
        require(msg.value >= amt);
        _; // Function body
    }
}

/*
 * A Vehicle instance is first created in the Ethereum blockchain by the dealer.
 * Once the payment is received, the dealer transfers ownership to the buyer.
 */

contract Vehicle2 is AmountOwed {
    enum DealStatus { Open, Closed }
    
    uint _flag;
    uint _vin;
    uint _cost;
    address _owner;
    address _dealer;
    DealStatus _status;
    
    event Bought(uint vin, uint cost);
    
    function getFlag() public view returns (uint) {
        return _flag;
    }
    
    function getVin() public view returns (uint) {
        return _vin;
    }
    
    function getCost() public view returns (uint) {
        return _cost;
    }
    
    function getOwner() public view returns (address) {
        return _owner;
    }
    
    function getDealer() public view returns (address) {
        return _dealer;
    }
    
    function getStatus() public view returns (DealStatus) {
        return _status;
    }
    
    // The keyword 'payable' is important for accepting ethers from the buyer
    function buyVehicle() public payable validate(_cost) {
        _flag = 1;
        // Only the assigned owner can close the deal
        if (msg.sender == _owner) {
            _flag = 2;
            _status = DealStatus.Closed;
            _dealer.transfer(_cost);
            Bought(_vin, _cost);
        }
    }
    
    function Vehicle2(uint vin, uint cost, address buyer) public {
        _flag = 0;
        _vin = vin;
        _cost = cost;
        _owner = buyer;
        _dealer = msg.sender;
        _status = DealStatus.Open;
    }
}