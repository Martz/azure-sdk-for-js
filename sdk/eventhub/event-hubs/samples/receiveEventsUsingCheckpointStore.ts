/*
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the MIT Licence.

  This sample demonstrates how to use the EventHubConsumerClient to process events from all partitions
  of a consumer group in an Event Hubs instance, as well as checkpointing along the way.

  Checkpointing using a durable store allows your application to be more resilient. When you restart
  your application after a crash (or an intentional stop), your application can continue consuming
  events from where it last checkpointed.
  
  If your Event Hub instance doesn't have any events, then please run "sendEvents.ts" sample
  to populate it before running this sample.

  Note: If you are using version 2.1.0 or lower of @azure/event-hubs library, then please use the samples at
  https://github.com/Azure/azure-sdk-for-js/tree/%40azure/event-hubs_2.1.0/sdk/eventhub/event-hubs/samples instead.
*/

import {
  EventHubConsumerClient, CheckpointStore,
} from "@azure/event-hubs";

import { ContainerClient } from "@azure/storage-blob";
import { BlobCheckpointStore } from "@azure/eventhubs-checkpointstore-blob";

const connectionString = "";
const eventHubName = "";
const storageConnectionString = "";
const containerName = "";
const consumerGroup = "";

async function main() {
  // this client will be used by our eventhubs-checkpointstore-blob, which 
  // persists any checkpoints from this session in Azure Storage
  const containerClient = new ContainerClient(storageConnectionString, containerName);

  if (!containerClient.exists()) {
    await containerClient.create();
  }

  const checkpointStore : CheckpointStore = new BlobCheckpointStore(containerClient);


  const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, eventHubName, checkpointStore);
   
  const subscription = consumerClient.subscribe({
      processEvents: async (events, context) => {
        for (const event of events) {
          console.log(`Received event: '${event.body}' from partition: '${context.partitionId}' and consumer group: '${context.consumerGroup}'`);
        }
    
        try {
          // save a checkpoint for the last event now that we've processed this batch.
          await context.updateCheckpoint(events[events.length - 1]);
        } catch (err) {
          console.log(`Error when checkpointing on partition ${context.partitionId}: `, err);
          throw err;
        };

        console.log(
          `Successfully checkpointed event with sequence number: ${events[events.length - 1].sequenceNumber} from partition: 'partitionContext.partitionId'`
        );
      },
      processError: async (err, context) => {
        console.log(`Error : ${err}`);
      }
    }
  );

  // after 30 seconds, stop processing
  await new Promise((resolve) => {
    setTimeout(async () => {
      await subscription.close();
      await consumerClient.close();
      resolve();
    }, 30000);
  });
}

main().catch((err) => {
  console.log("Error occurred: ", err);
});
