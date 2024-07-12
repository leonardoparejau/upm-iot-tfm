// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.19;

contract MetricsStorage {
    struct Metrics {
        uint256 timestamp;
        uint256 temperature;
        uint256 humidity;
        uint256 pressure;
    }

    mapping(bytes32 => Metrics[]) private deviceMetrics;

    function addMetrics(bytes32 deviceId, uint256 timestamp, uint256 temperature, uint256 humidity, uint256 pressure) public {
        deviceMetrics[deviceId].push(Metrics(timestamp, temperature, humidity, pressure));
    }

    function getMetricsCount(bytes32 deviceId) public view returns (uint256) {
        return deviceMetrics[deviceId].length;
    }

    function getMetric(bytes32 deviceId, uint256 index) public view returns (uint256, uint256, uint256, uint256) {
        Metrics storage metrics = deviceMetrics[deviceId][index];
        return (metrics.timestamp, metrics.temperature, metrics.humidity, metrics.pressure);
    }

    function getMetrics(bytes32 deviceId) public view returns (Metrics[] memory) {
        Metrics[] memory metrics = deviceMetrics[deviceId];
        return metrics;
    }
}