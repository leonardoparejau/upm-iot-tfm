// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.19;

contract ProductSummary {
    struct Summary {
        uint256 initialDate;
        uint256 endDate;
        uint256 maxTemp;
        uint256 minTemp;
        uint256 avgTemp;
        uint256 maxHumidity;
        uint256 minHumidity;
        uint256 avgHumidity;
    }

    mapping(bytes32 => Summary[]) private productSummary;

    function addSummary(bytes32 productId, uint256 initialDate, uint256 endDate, uint256 maxTemp, uint256 minTemp, uint256 avgTemp, uint256 maxHumidity, uint256 minHumidity, uint256 avgHumidity) public {
        productSummary[productId].push(Summary(initialDate, endDate, maxTemp, minTemp, avgTemp, maxHumidity, minHumidity, avgHumidity));
    }

}