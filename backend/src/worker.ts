import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './workflows/activities'
import { PROVIDER_ORDER, PROVIDER_SETTINGS, providerTaskQueue } from './enrichment/settings'

export async function runTemporalWorker() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  })
  try {
    const mainWorker = await Worker.create({
      connection,
      namespace: 'default',
      taskQueue: 'myQueue',
      workflowsPath: require.resolve('./workflows'),
      activities,
    })

    const providerWorkers = await Promise.all(
      PROVIDER_ORDER.map((id) =>
        Worker.create({
          connection,
          namespace: 'default',
          taskQueue: providerTaskQueue(id),
          activities: { lookupPhone: activities.lookupPhone },
          maxTaskQueueActivitiesPerSecond: PROVIDER_SETTINGS[id].rateLimitPerSecond,
        })
      )
    )

    await Promise.all([mainWorker, ...providerWorkers].map((worker) => worker.run()))
  } finally {
    await connection.close()
  }
}
