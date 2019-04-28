module.exports = async (args, repo, mappings) => {
  var account = repo.account;
  var table = repo.table;
  var scope = repo.scope;

  var result = { rows: [] }; // TODO: fetch table

  var results = result.rows;
  results.forEach(row => {
    var metadata = JSON.parse(row.metadata);
    mappings[row.name] = metadata.uri;
  });
};
