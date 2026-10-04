DEFINE FIELD OVERWRITE process_status ON TABLE document TYPE string
  ASSERT $value INSIDE ['processing', 'review', 'indexing', 'indexed', 'failed'];
DEFINE FIELD IF NOT EXISTS embedding_model ON TABLE document TYPE option<string>;
