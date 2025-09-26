// SPDX-License-Identifier: MIT
// Author: hagiasofia
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";




/**
 * @title FundNPC
 * @dev A batch payments contract supporting both equal and custom splits, for ERC20 and native ETH. Have fun!
 */
contract FundNPC is Initializable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    struct DepositInfo {
        address[] walletSet;
        uint256 reserveBalance;
        bool isETH;
    }

    struct CustomDeposit {
        address[] recipients;
        uint256[] amounts;
        uint256 totalDeposited;
        bool isETH;
    }

    mapping(address => DepositInfo) public deposits;
    mapping(address => mapping(address => CustomDeposit)) public customDeposits; 
    address constant ETH_ADDRESS = address(0);

    uint256 public constant FEE_BPS = 10;
    uint256 public constant MAX_BPS = 10000;
    address public feeRecipient;

    // ======= Events =======
    event FundsDeposited(address sender, address token, address[] walletSet, uint256 amount, uint256 fee);
    event FundsDepositedCustom(address sender, address token, address[] recipients, uint256[] amounts, uint256 totalAmount, uint256 fee);
    event FundsDistributed(address token, address[] recipients, uint256 amountPerRecipient);
    event FundsDistributedCustom(address token, address[] recipients, uint256[] amounts);
    event FeeRecipientChanged(address oldRecipient, address newRecipient);


    function initialize() external initializer {
        __Ownable_init(msg.sender);
        feeRecipient = msg.sender;
    }

    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid fee recipient");
        address old = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientChanged(old, _newRecipient);
    }

    function deposit(address _tokenAddress, address[] memory _walletSet, uint256 _amount) external {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_walletSet.length > 0, "Wallet set cannot be empty");
        require(_amount > 0, "Deposit amount must be greater than 0");

        (uint256 fee, uint256 depositNet) = _feeMath(_amount);

        IERC20 token = IERC20(_tokenAddress);

        token.safeTransferFrom(msg.sender, address(this), _amount);
        if (fee > 0) {
            token.safeTransfer(feeRecipient, fee);
        }

        deposits[_tokenAddress].walletSet = _walletSet;
        deposits[_tokenAddress].reserveBalance += depositNet;
        deposits[_tokenAddress].isETH = false;

        emit FundsDeposited(msg.sender, _tokenAddress, _walletSet, depositNet, fee);
    }

    function depositETH(address[] memory _walletSet) external payable {
        require(_walletSet.length > 0, "Wallet set cannot be empty");
        require(msg.value > 0, "Deposit amount must be greater than 0");

        (uint256 fee, uint256 depositNet) = _feeMath(msg.value);
        deposits[ETH_ADDRESS].walletSet = _walletSet;
        deposits[ETH_ADDRESS].reserveBalance += depositNet;
        deposits[ETH_ADDRESS].isETH = true;

        if (fee > 0) {
            (bool sent, ) = feeRecipient.call{value: fee}("");
            require(sent, "ETH fee transfer failed");
        }

        emit FundsDeposited(msg.sender, ETH_ADDRESS, _walletSet, depositNet, fee);
    }

    function distributeFunds(address _tokenAddress) external onlyOwner {
        DepositInfo storage depositInfo = deposits[_tokenAddress];
        require(depositInfo.reserveBalance > 0, "No tokens to distribute");
        require(depositInfo.walletSet.length > 0, "No wallets in the set");

        uint256 amountPerWallet = depositInfo.reserveBalance / depositInfo.walletSet.length;
        require(amountPerWallet > 0, "Amount per wallet too small");

        if (depositInfo.isETH) {
            for (uint256 i = 0; i < depositInfo.walletSet.length; i++) {
                address payable recipient = payable(depositInfo.walletSet[i]);
                require(recipient != address(0), "Invalid wallet address");
                recipient.transfer(amountPerWallet);
            }
        } else {
            IERC20 token = IERC20(_tokenAddress);
            for (uint256 i = 0; i < depositInfo.walletSet.length; i++) {
                address recipient = depositInfo.walletSet[i];
                require(recipient != address(0), "Invalid wallet address");
                token.safeTransfer(recipient, amountPerWallet);
            }
        }

        depositInfo.reserveBalance = 0;
        emit FundsDistributed(_tokenAddress, depositInfo.walletSet, amountPerWallet);
    }


    function depositCustom(address _tokenAddress, address[] memory recipients, uint256[] memory amounts) external {
        require(_tokenAddress != address(0), "Invalid token address");
        require(recipients.length > 0 && recipients.length == amounts.length, "Wallets/amounts mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount > 0, "Total must be greater than 0");

        (uint256 fee, uint256 depositNet) = _feeMath(totalAmount);
        require(depositNet == totalAmount - fee, "Fee logic error");

        IERC20 token = IERC20(_tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        if (fee > 0) {
            token.safeTransfer(feeRecipient, fee);
        }

        
        customDeposits[_tokenAddress][msg.sender] = CustomDeposit({
            recipients: recipients,
            amounts: amounts,
            totalDeposited: depositNet,
            isETH: false
        });

        emit FundsDepositedCustom(msg.sender, _tokenAddress, recipients, amounts, depositNet, fee);
    }

    function depositCustomETH(address[] memory recipients, uint256[] memory amounts) external payable {
        require(recipients.length > 0 && recipients.length == amounts.length, "Wallets/amounts mismatch");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        (uint256 fee, uint256 depositNet) = _feeMath(totalAmount);
        require(msg.value == totalAmount, "ETH sent mismatch with total");

        if (fee > 0) {
            (bool sent, ) = feeRecipient.call{value: fee}("");
            require(sent, "ETH fee transfer failed");
        }

        customDeposits[ETH_ADDRESS][msg.sender] = CustomDeposit({
            recipients: recipients,
            amounts: amounts,
            totalDeposited: depositNet,
            isETH: true
        });

        emit FundsDepositedCustom(msg.sender, ETH_ADDRESS, recipients, amounts, depositNet, fee);
    }

    function distributeCustom(address _tokenAddress, address depositor) external onlyOwner {
        CustomDeposit storage _d = customDeposits[_tokenAddress][depositor];
        require(_d.totalDeposited > 0, "Nothing to distribute");
        require(_d.recipients.length > 0, "No recipients");

        if (_d.isETH) {
            for (uint256 i = 0; i < _d.recipients.length; i++) {
                address payable recipient = payable(_d.recipients[i]);
                uint256 amount = _d.amounts[i];
                require(recipient != address(0), "Invalid wallet address");
                recipient.transfer(amount);
            }
        } else {
            IERC20 token = IERC20(_tokenAddress);
            for (uint256 i = 0; i < _d.recipients.length; i++) {
                address recipient = _d.recipients[i];
                uint256 amount = _d.amounts[i];
                require(recipient != address(0), "Invalid wallet address");
                token.safeTransfer(recipient, amount);
            }
        }
        emit FundsDistributedCustom(_tokenAddress, _d.recipients, _d.amounts);
        delete customDeposits[_tokenAddress][depositor];
    }

    function _feeMath(uint256 total) internal pure returns (uint256 fee, uint256 net) {
        fee = (total * FEE_BPS) / MAX_BPS;
        net = total - fee;
    }

    // =========== Views =========== //
    function getWalletSet(address _tokenAddress) external view returns (address[] memory) {
        return deposits[_tokenAddress].walletSet;
    }

    function getReserveBalance(address _tokenAddress) external view returns (uint256) {
        return deposits[_tokenAddress].reserveBalance;
    }

    function getCustomDeposit(address _tokenAddress, address depositor) external view returns (
        address[] memory recipients,
        uint256[] memory amounts,
        uint256 totalDeposited,
        bool isETH
    ) {
        CustomDeposit storage c = customDeposits[_tokenAddress][depositor];
        return (c.recipients, c.amounts, c.totalDeposited, c.isETH);
    }

    receive() external payable {}
}