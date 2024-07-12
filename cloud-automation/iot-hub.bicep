@description('TFM - Kubuka Poultry Management Project')
@minLength(1)
@maxLength(11)
param projectName string = 'tfm'

@description('The datacenter to use for the deployment.')
param location string = resourceGroup().location

@description('The SKU to use for the IoT Hub. (F1=Free SKU)')
param skuName string = 'F1'

@description('The number of IoT Hub units.')
param skuUnits int = 1

@description('Partitions used for the event stream. Number of replicas of the incoming data')
param d2cPartitions int = 2

var iotHubName = 'hub-${projectName}'

var publicIpName = 'tfm-public-ip'


// Azure Service Bus with topic creation

@description('Name of the Service Bus namespace')
param serviceBusNamespaceName string = 'tfm-bus-namespace'

@description('Name of the Queue')
param serviceBusTopicName string = 'tfm-bus-topic'

var busEndpoint = 'busendpoint-${projectName}'
var topicSendPolicyName = 'topicsend-${projectName}'
var topicReadPolicyName = 'topicread-${projectName}'
var topicSubscriptionName = 'subscription-${projectName}'
var alertTopicSubscriptionName = 'subscription-alert-management'

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-01-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  tags: {
    project: 'tfm'
  }
  sku: {
    name: 'Standard'
  }
  properties: {
    minimumTlsVersion: '1.2'
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}


resource serviceBusTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  name: serviceBusTopicName
  parent: serviceBusNamespace
  properties: {
    enableBatchedOperations: true
    enableExpress: false
    enablePartitioning: false
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: false
    supportOrdering: true
  }
}

// Keys for saving data (will be configured on IoT Hub)
resource topicAuthSendPolicy 'Microsoft.ServiceBus/namespaces/topics/authorizationRules@2022-10-01-preview' = {
  name: topicSendPolicyName
  parent: serviceBusTopic
  properties: {
    rights: [
      'Send'
    ]
  }
}

// Keys for reading data (will be configured on Application for processing and storage in vechain)
resource topicAuthReadPolicy 'Microsoft.ServiceBus/namespaces/topics/authorizationRules@2022-10-01-preview' = {
  name: topicReadPolicyName
  parent: serviceBusTopic
  properties: {
    rights: [
      'Listen'
    ]
  }
}

resource vechainTopicSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  name: topicSubscriptionName
  parent: serviceBusTopic
  properties: {
    enableBatchedOperations: true
    isClientAffine: false
    requiresSession: false
  }
}

resource alertTopicSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  name: alertTopicSubscriptionName
  parent: serviceBusTopic
  properties: {
    enableBatchedOperations: true
    isClientAffine: false
    requiresSession: false
  }
}


resource IoTHub 'Microsoft.Devices/IotHubs@2023-06-30' = {
  name: iotHubName
  location: location
  tags: {
    project: 'tfm'
  }
  sku: {
    name: skuName
    capacity: skuUnits
  }
  properties: {
    eventHubEndpoints: {
      events: {
        retentionTimeInDays: 1
        partitionCount: d2cPartitions
      }
    }
    routing: {
      endpoints: {
        serviceBusTopics: [
          {
            name: busEndpoint
            authenticationType: 'keyBased'
            connectionString: 'Endpoint=sb://${serviceBusNamespaceName}.servicebus.windows.net/;SharedAccessKeyName=${topicSendPolicyName};SharedAccessKey=${topicAuthSendPolicy.listKeys().primaryKey};EntityPath=${serviceBusTopicName}'
          }
        ]
      }
      routes: [
        {
          name: 'TfmBusRoute'
          source: 'DeviceMessages'
          condition: 'level="storage"'
          endpointNames: [
            busEndpoint
          ]
          isEnabled: true
        }
      ]
      fallbackRoute: {
        name: '$fallback'
        source: 'DeviceMessages'
        condition: 'true'
        endpointNames: [
          'events'
        ]
        isEnabled: true
      }
    }
    messagingEndpoints: {
      fileNotifications: {
        lockDurationAsIso8601: 'PT1M'
        ttlAsIso8601: 'PT1H'
        maxDeliveryCount: 10
      }
    }
    enableFileUploadNotifications: false
    cloudToDevice: {
      maxDeliveryCount: 10
      defaultTtlAsIso8601: 'PT1H'
      feedback: {
        lockDurationAsIso8601: 'PT1M'
        ttlAsIso8601: 'PT1H'
        maxDeliveryCount: 10
      }
    }
  }
}


// Azure AKS cluster provision


@description('The name of the Managed Cluster resource.')
param clusterName string = 'aks-${projectName}'

@description('Optional DNS prefix to use with hosted Kubernetes API server FQDN.')
param dnsPrefix string = 'tfm'

@description('Disk size (in GB) to provision for each of the agent pool nodes. This value ranges from 0 to 1023. Specifying 0 will apply the default disk size for that agentVMSize.')
@minValue(0)
@maxValue(1023)
param osDiskSizeGB int = 0

@description('The number of nodes for the cluster.')
@minValue(1)
@maxValue(50)
param agentCount int = 1

@description('The size of the Virtual Machine.')
param agentVMSize string = 'standard_d2s_v3'

@description('User name for the Linux Virtual Machines.')
param linuxAdminUsername string = 'tfmadmin'

@description('Configure all linux machines with the SSH RSA public key string. Your key should include three parts, for example \'ssh-rsa AAAAB...snip...UcyupgH azureuser@linuxvm\'')
param sshRSAPublicKey string = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCfJ/VFJ3gBNlf4KdQL8+fPGc+d6tCfU49h8AgYasA2Fq2Kg+hsQWKC24DRolZzoPvn7g/pmSnrujomBZvla5RiZ0Cmvs2RAF5SWU9sRs/nnjtWu0UtKtKqaRcwX6xJzJxYYdsE0UqtBHm2f50TLprUn4rpvptMKRfFT6ONAz+pjxoCFcNZbwUSPoT45YYWoE6C2JiUe0P2ddOnJyT7+i1QNy39B921jaN2MDZ+KI0V/MdwadcM2mT66L/7lvetyXmPryYmlB1vxSHVeEijgE4ii5lKeAQFf7uQBHkoDFlKH0ij+aMroaNC0FIa/MV1WCcW3csR77LYzygTglyOzPZpE5ConDo31dYbzIvnhCzVLbLzL05Lgho9PIfnHoNQCDRB2T5ZRYG4wanjEDIRRx8HWiBLK98vfFIdnlHRoN+QWmNo9IWvLMH1yhBRkjiknPgKunUznDzBmVCVharxP/d/Bk6MkTvmlmuGNn7/+Mi9Q7IAgse519BmZCEKeOSUhfM= leonardopareja@MacBook-Pro-de-Leonardo.local'

resource aks 'Microsoft.ContainerService/managedClusters@2024-02-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: dnsPrefix
    agentPoolProfiles: [
      {
        name: 'agentpool'
        osDiskSizeGB: osDiskSizeGB
        count: agentCount
        vmSize: agentVMSize
        osType: 'Linux'
        mode: 'System'
      }
    ]
    linuxProfile: {
      adminUsername: linuxAdminUsername
      ssh: {
        publicKeys: [
          {
            keyData: sshRSAPublicKey
          }
        ]
      }
    }
  }
}


// Deploy Azure Container Registry

@minLength(5)
@maxLength(50)
@description('Provide a globally unique name of your Azure Container Registry')
param acrName string = 'acrtfm${uniqueString(resourceGroup().id)}'

@description('Provide a tier of your Azure Container Registry.')
param acrSku string = 'Basic'

resource acrResource 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: true
  }
}


// Deploy DNS Zone and register Public IP record

resource publicIp 'Microsoft.Network/publicIPAddresses@2023-05-01' = {
  name: publicIpName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Global'
  }
  properties: {
    publicIPAddressVersion: 'IPv4'
    publicIPAllocationMethod: 'Static'
    idleTimeoutInMinutes: 4
  }
}


@description('The name of the DNS zone to be created.  Must have at least 2 segments, e.g. hostname.org')
param zoneName string = 'lpareja.com'

@description('The name of the DNS record to be created.  The name is relative to the zone, not the FQDN.')
param recordName string = 'tfm'

resource zone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: zoneName
  location: 'global'
}

resource record 'Microsoft.Network/dnsZones/A@2018-05-01' = {
  parent: zone
  name: recordName
  properties: {
    TTL: 3600
    ARecords: [
      {
        ipv4Address: publicIp.properties.ipAddress
      }
    ]
  }
}

output nameServers array = zone.properties.nameServers





@description('Output the login server property for later use')
output loginServer string = acrResource.properties.loginServer
output controlPlaneFQDN string = aks.properties.fqdn
output name string = IoTHub.name
output resourceId string = IoTHub.id
output resourceGroupName string = resourceGroup().name
output location string = location
