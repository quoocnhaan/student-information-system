# Background jobs

Each service owns its job table, queues, task code, and worker containers. API and workers run from one image with different commands; only the API exposes a port. Services share a RabbitMQ cluster, but each uses its own vhost and a user permitted only on that vhost.

A queue represents a workload profile, such as CPU-heavy OCR or short embedding calls. Types with similar resource needs share a queue. Add worker replicas to increase throughput rather than creating a queue per replica.

Messages contain a version, type, and job ID. The owning worker loads inputs from its own database and object store and writes results there. Cross-service work uses events or the owning service's API; one service does not import another's task code.

When domain data and jobs share a database, create a document and its first job in one transaction. Complete a stage, save its output, and enqueue the next stage in one transaction. Failure state and domain state likewise commit together. Publishing is best effort; the API replays queued rows when it connects or reconnects to the broker. Workers claim before ACK so duplicate messages cannot process the same job twice.
